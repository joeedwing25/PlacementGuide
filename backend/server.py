"""InterviewIQ AI - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import certifi
from datetime import datetime, timezone
from typing import Optional, List, Any
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user,
)
from gemini_service import (
    analyze_resume, generate_quiz, generate_roadmap,
    next_interview_question, evaluate_interview_answer, coach_reply,
)
from resume_parser import extract_resume_text


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("interviewiq")


# ---------- DB ----------
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get("DB_NAME", "interviewiq")]


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
app = FastAPI(title="InterviewIQ AI")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.profiles.create_index("user_id", unique=True)
    await db.quizzes.create_index("user_id")
    await db.interviews.create_index("user_id")
    await db.coach_messages.create_index("user_id")
    await db.resumes.create_index("user_id")
    await db.roadmaps.create_index("user_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@interviewiq.ai")
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


def _profile_summary(profile: dict, name: str = "") -> str:
    if not profile:
        return f"Name: {name}\n(no profile data yet)"
    return (
        f"Name: {name}\nTarget Role: {profile.get('target_role','')}\n"
        f"College: {profile.get('college','')} | Degree: {profile.get('degree','')} ({profile.get('branch','')})\n"
        f"Skills: {', '.join(profile.get('skills',[]))}\n"
        f"Languages: {', '.join(profile.get('languages',[]))}\n"
        f"Frameworks: {', '.join(profile.get('frameworks',[]))}\n"
        f"Projects: {', '.join(p.get('name','') for p in profile.get('projects',[]))}"
    )


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


@api.post("/quiz/start")
async def quiz_start(body: QuizStartIn, user=Depends(get_current_user)):
    if body.count not in (5, 10, 20, 50):
        body.count = 10
    data = await generate_quiz(body.topic, body.difficulty, body.count)
    questions = data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions")
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
    safe_qs = [{k: v for k, v in q.items() if k not in ("correct_answer", "explanation")} for q in questions]
    out = _serialize(quiz)
    out["questions"] = safe_qs
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
        is_correct = (str(user_ans).strip().upper() == str(q.get("correct_answer", "")).strip().upper())
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
    cur = db.quizzes.find({"user_id": _user_oid(user), "status": "completed"},
                         {"questions": 0, "answers": 0}).sort("created_at", -1).limit(50)
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


@api.post("/interview/start")
async def interview_start(body: InterviewStartIn, user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": _user_oid(user)})
    summary = _profile_summary(profile or {}, user.get("name", ""))
    q = await next_interview_question(body.mode, summary, [])
    session = {
        "user_id": _user_oid(user),
        "mode": body.mode,
        "context": summary,
        "qa": [{"question": q["question"], "category": q.get("category", "")}],
        "status": "in_progress",
        "created_at": now_iso(),
    }
    res = await db.interviews.insert_one(session)
    return {"session_id": str(res.inserted_id), "question": q["question"], "category": q.get("category", "")}


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
    current_q = qa[-1]
    evaluation = await evaluate_interview_answer(current_q["question"], body.answer, session["mode"])
    qa[-1] = {**current_q, "answer": body.answer, "evaluation": evaluation}

    next_q_text, next_cat, done = None, None, False
    if len(qa) < 5:
        asked = [item["question"] for item in qa]
        next_q = await next_interview_question(session["mode"], session["context"], asked)
        next_q_text = next_q["question"]
        next_cat = next_q.get("category", "")
        qa.append({"question": next_q_text, "category": next_cat})
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
        "category": next_cat,
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


# ============================================================
# COACH CHAT
# ============================================================
class CoachIn(BaseModel):
    message: str


@api.get("/coach/history")
async def coach_history(user=Depends(get_current_user)):
    cur = db.coach_messages.find({"user_id": _user_oid(user)}).sort("created_at", 1).limit(200)
    items = [{"role": d["role"], "content": d["content"], "created_at": d["created_at"]} async for d in cur]
    return {"items": items}


@api.post("/coach/chat")
async def coach_chat(body: CoachIn, user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": _user_oid(user)})
    summary = _profile_summary(profile or {}, user.get("name", ""))
    cur = db.coach_messages.find({"user_id": _user_oid(user)}).sort("created_at", -1).limit(10)
    history = [{"role": d["role"], "content": d["content"]} async for d in cur]
    history.reverse()

    reply = await coach_reply(history, summary, body.message)

    await db.coach_messages.insert_one({
        "user_id": _user_oid(user), "role": "user",
        "content": body.message, "created_at": now_iso(),
    })
    await db.coach_messages.insert_one({
        "user_id": _user_oid(user), "role": "assistant",
        "content": reply, "created_at": now_iso(),
    })
    return {"reply": reply}


# ============================================================
# ROADMAP
# ============================================================
@api.post("/roadmap/generate")
async def roadmap_generate(user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": _user_oid(user)})
    summary = _profile_summary(profile or {}, user.get("name", ""))
    data = await generate_roadmap(summary)
    doc = {"user_id": _user_oid(user), "data": data, "created_at": now_iso()}
    await db.roadmaps.update_one({"user_id": _user_oid(user)},
                                 {"$set": doc}, upsert=True)
    return {"roadmap": data}


@api.get("/roadmap")
async def roadmap_get(user=Depends(get_current_user)):
    r = await db.roadmaps.find_one({"user_id": _user_oid(user)})
    if not r:
        return {"roadmap": None}
    return {"roadmap": r.get("data")}


class RoadmapTaskToggle(BaseModel):
    phase: str
    task_id: str
    done: bool


@api.post("/roadmap/toggle")
async def roadmap_toggle(body: RoadmapTaskToggle, user=Depends(get_current_user)):
    r = await db.roadmaps.find_one({"user_id": _user_oid(user)})
    if not r:
        raise HTTPException(status_code=404, detail="No roadmap")
    data = r["data"]
    phase = data.get(body.phase)
    if not phase:
        raise HTTPException(status_code=400, detail="Invalid phase")
    for t in phase.get("tasks", []):
        if t.get("id") == body.task_id:
            t["done"] = body.done
            break
    await db.roadmaps.update_one({"user_id": _user_oid(user)}, {"$set": {"data": data}})
    return {"roadmap": data}


# ============================================================
# ANALYTICS
# ============================================================
@api.get("/analytics/overview")
async def analytics_overview(user=Depends(get_current_user)):
    resume = await db.resumes.find_one({"user_id": _user_oid(user)}, sort=[("created_at", -1)])
    resume_score = resume["analysis"].get("ats_score", 0) if resume else 0

    quiz_cur = db.quizzes.find({"user_id": _user_oid(user), "status": "completed"})
    topic_scores: dict = {}
    quiz_history_points = []
    async for q in quiz_cur:
        topic_scores.setdefault(q["topic"], []).append(q.get("score", 0))
        quiz_history_points.append({
            "date": q.get("completed_at") or q.get("created_at"),
            "topic": q["topic"],
            "score": q.get("score", 0),
        })
    topic_avg = {t: round(sum(s) / len(s)) for t, s in topic_scores.items() if s}

    interview_scores = []
    interview_cur = db.interviews.find({"user_id": _user_oid(user), "status": "completed"})
    async for iv in interview_cur:
        interview_scores.append(iv.get("overall_score", 0))
    interview_avg = round(sum(interview_scores) / len(interview_scores)) if interview_scores else 0

    rm = await db.roadmaps.find_one({"user_id": _user_oid(user)})
    completed, total = 0, 0
    if rm:
        for ph in ("phase_30", "phase_60", "phase_90"):
            tasks = (rm["data"].get(ph) or {}).get("tasks", [])
            total += len(tasks)
            completed += sum(1 for t in tasks if t.get("done"))
    roadmap_pct = round((completed / total) * 100) if total else 0

    quiz_overall = round(sum(topic_avg.values()) / len(topic_avg)) if topic_avg else 0
    components = [resume_score, quiz_overall, interview_avg, roadmap_pct]
    nonzero = [c for c in components if c > 0]
    readiness = round(sum(nonzero) / len(nonzero)) if nonzero else 0

    return {
        "readiness_score": readiness,
        "resume_score": resume_score,
        "quiz_average": quiz_overall,
        "interview_average": interview_avg,
        "roadmap_progress": roadmap_pct,
        "topic_breakdown": topic_avg,
        "quiz_history": sorted(quiz_history_points, key=lambda x: x["date"])[-20:],
        "counts": {
            "resumes": await db.resumes.count_documents({"user_id": _user_oid(user)}),
            "quizzes": await db.quizzes.count_documents({"user_id": _user_oid(user), "status": "completed"}),
            "interviews": len(interview_scores),
            "roadmap_tasks_completed": completed,
            "roadmap_tasks_total": total,
        },
    }


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
