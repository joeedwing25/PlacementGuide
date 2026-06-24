"""PlacementGuide - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import certifi
from datetime import datetime, timezone
from typing import Optional, List, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
)
from gemini_service import analyze_resume
from resume_parser import extract_resume_text


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("placementguide")


# ---------- DB ----------
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get("DB_NAME", "placementguide")]


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_oid(user) -> ObjectId:
    return ObjectId(user["id"])


def _serialize(doc: dict) -> dict:
    if not doc:
        return doc
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        doc.pop("_id", None)
    if "user_id" in doc and isinstance(doc["user_id"], ObjectId):
        doc["user_id"] = str(doc["user_id"])
    return doc


# ---------- App ----------
app = FastAPI(title="PlacementGuide")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.profiles.create_index("user_id", unique=True)
    await db.quizzes.create_index("user_id")
    await db.interviews.create_index("user_id")
    await db.resumes.create_index("user_id")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@placementguide.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")


# ============================================================
# AUTH
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _public_user(user: dict) -> dict:
    return {
        "id": str(user.get("_id") or user.get("id")),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at"),
    }


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "role": "user",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": _public_user({**doc, "_id": res.inserted_id}), "access_token": access}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": _public_user(user), "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return _public_user(user)


# ============================================================
# PROFILE
# ============================================================
class ProfileIn(BaseModel):
    college: Optional[str] = ""
    degree: Optional[str] = ""
    branch: Optional[str] = ""
    graduation_year: Optional[int] = None
    target_role: Optional[str] = ""
    skills: List[str] = []
    languages: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    tools: List[str] = []
    github_url: Optional[str] = ""
    leetcode_url: Optional[str] = ""
    hackerrank_url: Optional[str] = ""
    codeforces_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    projects: List[dict] = []
    achievements: List[str] = []


@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    p = await db.profiles.find_one({"user_id": _user_oid(user)})
    if not p:
        return {"profile": None}
    return {"profile": _serialize(p)}


@api.put("/profile")
async def upsert_profile(body: ProfileIn, user=Depends(get_current_user)):
    data = body.model_dump()
    data["user_id"] = _user_oid(user)
    data["updated_at"] = now_iso()
    await db.profiles.update_one({"user_id": _user_oid(user)},
                                 {"$set": data, "$setOnInsert": {"created_at": now_iso()}},
                                 upsert=True)
    p = await db.profiles.find_one({"user_id": _user_oid(user)})
    return {"profile": _serialize(p)}


# ============================================================
# RESUME
# ============================================================
@api.post("/resume/analyze")
async def resume_analyze(file: UploadFile = File(...), target_role: str = Form(""), user=Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    try:
        text = extract_resume_text(file.filename, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    if not target_role:
        p = await db.profiles.find_one({"user_id": _user_oid(user)})
        target_role = (p or {}).get("target_role", "Software Engineer")

    analysis = await analyze_resume(text, target_role or "Software Engineer")
    doc = {
        "user_id": _user_oid(user),
        "filename": file.filename,
        "target_role": target_role,
        "resume_text": text[:20000],
        "analysis": analysis,
        "created_at": now_iso(),
    }
    res = await db.resumes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"resume": _serialize(doc)}


@api.get("/resume/latest")
async def resume_latest(user=Depends(get_current_user)):
    doc = await db.resumes.find_one({"user_id": _user_oid(user)}, sort=[("created_at", -1)])
    if not doc:
        return {"resume": None}
    return {"resume": _serialize(doc)}


# ============================================================
# QUIZ
# ============================================================
class QuizStartIn(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 10


class QuizSubmitIn(BaseModel):
    quiz_id: str
    answers: dict  # {q_id: "A"}

# Static questions for a "student-built" feel
STATIC_QUESTIONS = [
    {"id": "q1", "question": "What is the time complexity of searching in a balanced BST?", "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"], "correct_answer": "O(log n)", "explanation": "Balanced BST search is logarithmic."},
    {"id": "q2", "question": "Which of these is not a feature of OOP?", "options": ["Encapsulation", "Polymorphism", "Inheritance", "Compilation"], "correct_answer": "Compilation", "explanation": "Compilation is a process, not an OOP feature."},
    {"id": "q3", "question": "What does SQL stand for?", "options": ["Structured Query Language", "Strong Question Language", "Simple Query List", "Server Queue Language"], "correct_answer": "Structured Query Language", "explanation": "Standard for database queries."},
    {"id": "q4", "question": "In Python, which keyword is used to create a function?", "options": ["func", "define", "def", "lambda"], "correct_answer": "def", "explanation": "'def' is the standard keyword for functions."},
    {"id": "q5", "question": "Which layer of the OSI model is responsible for routing?", "options": ["Data Link", "Network", "Transport", "Physical"], "correct_answer": "Network", "explanation": "The Network layer handles IP routing."},
]

@api.post("/quiz/start")
async def quiz_start(body: QuizStartIn, user=Depends(get_current_user)):
    # In a real student project, they might have a local JSON file or a simple DB collection of questions.
    # We'll use a subset of static questions based on count.
    questions = STATIC_QUESTIONS[:body.count]
    quiz = {
        "user_id": _user_oid(user),
        "topic": body.topic,
        "difficulty": body.difficulty,
        "questions": questions,
        "status": "in_progress",
        "created_at": now_iso(),
    }
    res = await db.quizzes.insert_one(quiz)
    quiz["_id"] = res.inserted_id
    out = _serialize(quiz)
    # Hide correct answers for in-progress quiz
    out["questions"] = [{k: v for k, v in q.items() if k not in ("correct_answer", "explanation")} for q in questions]
    return {"quiz": out}


@api.post("/quiz/submit")
async def quiz_submit(body: QuizSubmitIn, user=Depends(get_current_user)):
    try:
        oid = ObjectId(body.quiz_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quiz id")
    quiz = await db.quizzes.find_one({"_id": oid, "user_id": _user_oid(user)})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    total = len(quiz["questions"])
    correct = 0
    detail = []
    for q in quiz["questions"]:
        qid = q.get("id")
        user_ans = body.answers.get(qid, "")
        # We handle both index-based (A, B, C, D) or text-based comparison if needed.
        # Here we assume the static questions use the text as correct_answer for simplicity or the option value.
        is_correct = (str(user_ans).strip() == str(q.get("correct_answer", "")).strip())
        if is_correct:
            correct += 1
        detail.append({
            "id": qid,
            "question": q.get("question"),
            "your_answer": user_ans,
            "correct_answer": q.get("correct_answer"),
            "is_correct": is_correct,
            "explanation": q.get("explanation"),
        })
    score = round((correct / total) * 100) if total else 0
    await db.quizzes.update_one({"_id": oid}, {"$set": {
        "status": "completed", "score": score, "correct": correct, "total": total,
        "answers": body.answers, "completed_at": now_iso(),
    }})
    return {"score": score, "correct": correct, "total": total, "detail": detail}


@api.get("/quiz/history")
async def quiz_history(user=Depends(get_current_user)):
    cur = db.quizzes.find({"user_id": _user_oid(user), "status": "completed"}).sort("created_at", -1).limit(50)
    items = [_serialize(d) async for d in cur]
    return {"items": items}


# ============================================================
# INTERVIEW
# ============================================================
class InterviewStartIn(BaseModel):
    mode: str = "technical"


class InterviewAnswerIn(BaseModel):
    session_id: str
    answer: str

STATIC_INTERVIEW_QUESTIONS = {
    "technical": [
        "What is the difference between a process and a thread?",
        "Explain the concept of virtual memory.",
        "What are the ACID properties in a database?",
        "How does a hash table work under the hood?",
        "What is the difference between TCP and UDP?"
    ],
    "behavioral": [
        "Tell me about a time you faced a conflict in a team.",
        "What is your greatest strength and weakness?",
        "Why do you want to join this company?",
        "Describe a challenging project you worked on.",
        "Where do you see yourself in 5 years?"
    ]
}

@api.post("/interview/start")
async def interview_start(body: InterviewStartIn, user=Depends(get_current_user)):
    mode = body.mode if body.mode in STATIC_INTERVIEW_QUESTIONS else "technical"
    questions = STATIC_INTERVIEW_QUESTIONS[mode]
    q = questions[0]
    session = {
        "user_id": _user_oid(user),
        "mode": mode,
        "qa": [{"question": q, "index": 0}],
        "status": "in_progress",
        "created_at": now_iso(),
    }
    res = await db.interviews.insert_one(session)
    return {"session_id": str(res.inserted_id), "question": q}


@api.post("/interview/answer")
async def interview_answer(body: InterviewAnswerIn, user=Depends(get_current_user)):
    try:
        oid = ObjectId(body.session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    session = await db.interviews.find_one({"_id": oid, "user_id": _user_oid(user)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    qa = session["qa"]
    current_idx = qa[-1]["index"]

    # Simple length-based evaluation for "student" feel
    ans_len = len(body.answer.strip())
    score = 40 if ans_len < 20 else 70 if ans_len < 100 else 90
    evaluation = {
        "overall_score": score,
        "feedback": "Good attempt. Try to be more detailed." if ans_len < 50 else "Solid answer with good detail.",
        "improvements": ["Add more specific examples."] if ans_len < 100 else []
    }

    qa[-1]["answer"] = body.answer
    qa[-1]["evaluation"] = evaluation

    next_q_text, done = None, False
    questions = STATIC_INTERVIEW_QUESTIONS.get(session["mode"], STATIC_INTERVIEW_QUESTIONS["technical"])

    if current_idx + 1 < len(questions) and current_idx < 4: # limit to 5 questions
        next_idx = current_idx + 1
        next_q_text = questions[next_idx]
        qa.append({"question": next_q_text, "index": next_idx})
    else:
        done = True

    update = {"qa": qa}
    if done:
        scores = [item["evaluation"]["overall_score"] for item in qa if "evaluation" in item]
        avg = round(sum(scores) / len(scores)) if scores else 0
        update["status"] = "completed"
        update["overall_score"] = avg
        update["completed_at"] = now_iso()
    await db.interviews.update_one({"_id": oid}, {"$set": update})

    return {
        "evaluation": evaluation,
        "next_question": next_q_text,
        "done": done,
        "overall_score": update.get("overall_score"),
    }


@api.get("/interview/history")
async def interview_history(user=Depends(get_current_user)):
    cur = db.interviews.find({"user_id": _user_oid(user)}).sort("created_at", -1).limit(50)
    items = [_serialize(d) async for d in cur]
    return {"items": items}


@api.get("/interview/{session_id}")
async def interview_detail(session_id: str, user=Depends(get_current_user)):
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    s = await db.interviews.find_one({"_id": oid, "user_id": _user_oid(user)})
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return {"session": _serialize(s)}


app.include_router(api)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
