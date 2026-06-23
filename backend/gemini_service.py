"""Gemini service wrapper for InterviewIQ AI -- calls the Gemini API directly via google-genai."""
import os
import json
import re
import uuid
from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-2.5-flash"

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ["GEMINI_API_KEY"]
        _client = genai.Client(api_key=api_key)
    return _client


def _extract_json(text: str):
    """Extract JSON from possibly markdown-wrapped LLM output."""
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    raw = fence.group(1) if fence else text
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        for opener, closer in [("{", "}"), ("[", "]")]:
            start = raw.find(opener)
            end = raw.rfind(closer)
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(raw[start:end + 1])
                except json.JSONDecodeError:
                    continue
    return None


async def ask_gemini(system: str, user_text: str, session_id: str | None = None) -> str:
    """Single-turn call to Gemini with a system instruction. session_id kept for API
    compatibility with callers but unused -- each call here is stateless."""
    client = _get_client()
    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_text,
        config=types.GenerateContentConfig(system_instruction=system),
    )
    return response.text or ""


async def ask_gemini_json(system: str, user_text: str, session_id: str | None = None) -> dict | list | None:
    raw = await ask_gemini(system + "\n\nReturn ONLY valid JSON. No prose, no markdown.", user_text, session_id)
    return _extract_json(raw)


# ---------- Domain helpers ----------

RESUME_ANALYZER_SYSTEM = """You are an expert ATS (Applicant Tracking System) resume reviewer for tech roles.
Analyze the candidate's resume and return a strict JSON object with these keys:
{
  "ats_score": number (0-100),
  "skill_match_score": number (0-100),
  "resume_quality_score": number (0-100),
  "summary": string,
  "missing_skills": [string],
  "missing_keywords": [string],
  "weak_bullets": [{"original": string, "improved": string}],
  "grammar_issues": [string],
  "missing_metrics": [string],
  "strengths": [string],
  "improvement_suggestions": [string]
}
Be specific, actionable, and concise. Always return all keys."""


async def analyze_resume(resume_text: str, target_role: str) -> dict:
    user = f"TARGET_ROLE: {target_role}\n\nRESUME_TEXT:\n{resume_text[:12000]}"
    data = await ask_gemini_json(RESUME_ANALYZER_SYSTEM, user)
    if not isinstance(data, dict):
        data = {
            "ats_score": 50, "skill_match_score": 50, "resume_quality_score": 50,
            "summary": "Could not parse AI response.",
            "missing_skills": [], "missing_keywords": [], "weak_bullets": [],
            "grammar_issues": [], "missing_metrics": [],
            "strengths": [], "improvement_suggestions": [],
        }
    return data


QUIZ_SYSTEM = """You are an expert technical interview question generator.
Generate quiz questions in strict JSON format:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}
All questions must be MCQ with exactly 4 options labeled A-D. correct_answer must be one of A/B/C/D."""


async def generate_quiz(topic: str, difficulty: str, count: int) -> dict:
    user = f"Generate {count} {difficulty} difficulty MCQ questions on the topic: {topic}. Vary the sub-topics covered."
    data = await ask_gemini_json(QUIZ_SYSTEM, user)
    if not isinstance(data, dict) or "questions" not in data:
        return {"questions": []}
    return data


ROADMAP_SYSTEM = """You are a career coach who builds practical learning roadmaps.
Return strict JSON:
{
  "phase_30": {"title": "Foundations", "tasks": [{"id":"t1","title":"...","category":"DSA|SQL|System Design|Web|Aptitude|Projects|Interview","done":false}]},
  "phase_60": {...same shape...},
  "phase_90": {...same shape...}
}
Each phase should have 8-12 tasks across categories. Be specific and actionable."""


async def generate_roadmap(profile_summary: str) -> dict:
    data = await ask_gemini_json(ROADMAP_SYSTEM, profile_summary)
    if not isinstance(data, dict):
        return {"phase_30": {"title": "Foundations", "tasks": []},
                "phase_60": {"title": "Build", "tasks": []},
                "phase_90": {"title": "Polish", "tasks": []}}
    return data


INTERVIEW_QUESTION_SYSTEM = """You are an experienced technical interviewer.
Given the interview MODE and candidate context, generate ONE relevant interview question.
Return JSON: {"question": "string", "category": "string"}.
Keep the question realistic, specific and around 1-3 sentences."""


async def next_interview_question(mode: str, context: str, asked: list[str]) -> dict:
    asked_str = "\n".join(f"- {q}" for q in asked) if asked else "(none)"
    user = f"MODE: {mode}\n\nCANDIDATE CONTEXT:\n{context}\n\nALREADY ASKED:\n{asked_str}\n\nGive ONE next question."
    data = await ask_gemini_json(INTERVIEW_QUESTION_SYSTEM, user)
    if not isinstance(data, dict) or "question" not in data:
        return {"question": "Tell me about a challenging project you worked on.", "category": "general"}
    return data


INTERVIEW_EVAL_SYSTEM = """You evaluate interview answers. Return strict JSON:
{
  "technical_accuracy": number (0-10),
  "communication": number (0-10),
  "confidence": number (0-10),
  "clarity": number (0-10),
  "completeness": number (0-10),
  "overall_score": number (0-100),
  "feedback": string,
  "improvements": [string]
}"""


async def evaluate_interview_answer(question: str, answer: str, mode: str) -> dict:
    user = f"MODE: {mode}\nQUESTION: {question}\nCANDIDATE ANSWER: {answer}\n\nEvaluate honestly."
    data = await ask_gemini_json(INTERVIEW_EVAL_SYSTEM, user)
    if not isinstance(data, dict):
        return {"technical_accuracy": 5, "communication": 5, "confidence": 5,
                "clarity": 5, "completeness": 5, "overall_score": 50,
                "feedback": "Could not parse evaluation.", "improvements": []}
    return data


COACH_SYSTEM = """You are an empathetic AI career coach for students preparing for tech internships and placements.
Provide concise, actionable, friendly advice. Use markdown for structure when helpful.
You know about resumes, DSA, system design, behavioral interviews, salary negotiation, and project ideas.
Personalize answers based on the user profile provided."""


async def coach_reply(history: list[dict], profile_summary: str, user_msg: str) -> str:
    system = COACH_SYSTEM + f"\n\nUSER PROFILE:\n{profile_summary}"
    if history:
        convo = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-8:])
        full = f"Previous conversation:\n{convo}\n\nUSER: {user_msg}"
    else:
        full = user_msg
    return await ask_gemini(system, full, session_id=f"coach-{uuid.uuid4()}")
