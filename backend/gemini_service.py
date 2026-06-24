"""Gemini service wrapper for PlacementGuide -- calls the Gemini API directly via google-genai."""
import os
import json
import re
from google import genai
from google.genai import types

GEMINI_MODEL = "gemini-1.5-flash"

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


async def ask_gemini(system: str, user_text: str) -> str:
    """Single-turn call to Gemini with a system instruction."""
    client = _get_client()
    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_text,
        config=types.GenerateContentConfig(system_instruction=system),
    )
    return response.text or ""


async def ask_gemini_json(system: str, user_text: str) -> dict | list | None:
    raw = await ask_gemini(system + "\n\nReturn ONLY valid JSON. No prose, no markdown.", user_text)
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
