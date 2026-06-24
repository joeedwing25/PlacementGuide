"""
PlacementGuide - Backend API regression tests.

Covers: auth (register/login/me), profile, resume analyze, quiz start+submit,
interview start+answer.

Run:
  pytest backend/tests/backend_test.py -v
"""
import io
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "http://localhost:8000",
).rstrip("/")

ADMIN_EMAIL = "admin@placementguide.com"
ADMIN_PASSWORD = "admin123"

# ---------- shared fixtures ----------


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user(api):
    """Register a fresh test user and return (email, password, token, user)."""
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com".lower()
    password = "testpass123"
    name = "TEST User"
    r = api.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"].lower() == email
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["access_token"],
        "user": data["user"],
    }


@pytest.fixture(scope="session")
def auth_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}"}


# ---------- AUTH ----------


class TestAuth:
    def test_register_duplicate_returns_400(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_user["email"],
                "password": "anotherpass",
                "name": "Dup",
            },
        )
        assert r.status_code == 400

    def test_login_bad_password(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user["email"], "password": "wrongpass"},
        )
        assert r.status_code == 401

    def test_login_good_password_sets_cookie(self, api, test_user):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["email"] == test_user["email"]
        assert isinstance(body["access_token"], str) and len(body["access_token"]) > 20
        # cookie may or may not be set depending on Secure flag and host; just check
        cookies = "; ".join(r.headers.get("set-cookie", "").split(","))
        assert "access_token" in cookies or "access_token" in r.cookies.get_dict()

    def test_admin_login_works(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_me_with_bearer(self, auth_headers, test_user):
        # Use raw requests (no shared session cookies) to verify Bearer-only auth
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == test_user["email"]

    def test_me_without_auth_401(self, api):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------- PROFILE ----------


class TestProfile:
    def test_put_then_get_profile(self, api, auth_headers):
        payload = {
            "college": "TEST College",
            "degree": "B.Tech",
            "branch": "CSE",
            "graduation_year": 2026,
            "target_role": "Backend Engineer",
            "skills": ["python", "fastapi", "mongodb"],
            "languages": ["python", "javascript"],
            "frameworks": ["fastapi", "react"],
            "databases": ["mongodb"],
            "tools": ["git"],
            "projects": [{"name": "Test Project", "description": "demo"}],
            "achievements": ["TEST achievement"],
        }
        r = api.put(f"{BASE_URL}/api/profile", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        prof = r.json()["profile"]
        assert prof["target_role"] == "Backend Engineer"
        assert "python" in prof["skills"]

        # GET verifies persistence
        r2 = api.get(f"{BASE_URL}/api/profile", headers=auth_headers)
        assert r2.status_code == 200
        got = r2.json()["profile"]
        assert got["college"] == "TEST College"
        assert got["graduation_year"] == 2026
        assert "id" in got
        assert "_id" not in got  # mongo _id must be excluded


# ---------- RESUME ----------


def _make_sample_pdf() -> bytes:
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    lines = [
        "TEST User - Resume",
        "Email: test@test.com | Phone: 555-1212",
        "Education: B.Tech in Computer Science",
        "Skills: Python, FastAPI, MongoDB, React, JavaScript",
        "Experience: Built REST APIs with FastAPI, deployed on AWS.",
        "Projects: Built a placement prep platform using React + FastAPI.",
        "Achievements: Solved 300+ DSA problems on LeetCode.",
    ]
    y = 800
    for ln in lines:
        c.drawString(50, y, ln)
        y -= 20
    c.save()
    return buf.getvalue()


class TestResume:
    def test_resume_reject_unsupported_filetype(self, auth_headers):
        files = {"file": ("bad.exe", b"MZ\x00\x00", "application/octet-stream")}
        r = requests.post(
            f"{BASE_URL}/api/resume/analyze",
            files=files,
            data={"target_role": "Backend Engineer"},
            headers=auth_headers,
        )
        assert r.status_code == 400, r.text

    def test_resume_analyze_pdf(self, auth_headers):
        pdf_bytes = _make_sample_pdf()
        files = {"file": ("test_resume.pdf", pdf_bytes, "application/pdf")}
        r = requests.post(
            f"{BASE_URL}/api/resume/analyze",
            files=files,
            data={"target_role": "Backend Engineer"},
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:500]}"
        body = r.json()
        resume = body["resume"]
        analysis = resume["analysis"]
        for key in (
            "ats_score",
            "skill_match_score",
            "resume_quality_score",
            "summary",
        ):
            assert key in analysis, f"missing {key} in {list(analysis.keys())}"
        assert isinstance(analysis["ats_score"], (int, float))


# ---------- QUIZ ----------


@pytest.fixture(scope="session")
def quiz_session(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/quiz/start",
        json={"topic": "DSA", "difficulty": "easy", "count": 5},
        headers={**auth_headers, "Content-Type": "application/json"},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    return r.json()["quiz"]


class TestQuiz:
    def test_quiz_start_no_correct_answer_leaked(self, quiz_session):
        qs = quiz_session["questions"]
        assert len(qs) >= 1
        for q in qs:
            assert "correct_answer" not in q
            assert "id" in q and "question" in q

    def test_quiz_submit_returns_score(self, auth_headers, quiz_session):
        qs = quiz_session["questions"]
        # In the new server, static questions are returned.
        # We don't necessarily know the correct answers here without looking at server.py,
        # but we can at least verify the submission works.
        answers = {q["id"]: "O(log n)" for q in qs}
        r = requests.post(
            f"{BASE_URL}/api/quiz/submit",
            json={"quiz_id": quiz_session["id"], "answers": answers},
            headers={**auth_headers, "Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "score" in body and 0 <= body["score"] <= 100
        assert body["total"] == len(qs)
        assert isinstance(body["detail"], list) and len(body["detail"]) == len(qs)
        for d in body["detail"]:
            assert "is_correct" in d
            assert "correct_answer" in d


# ---------- INTERVIEW ----------


class TestInterview:
    def test_interview_full_flow(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/interview/start",
            json={"mode": "technical"},
            headers={**auth_headers, "Content-Type": "application/json"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        sid = body["session_id"]
        assert body["question"]

        done = False
        loops = 0
        while not done and loops < 6:
            r2 = requests.post(
                f"{BASE_URL}/api/interview/answer",
                json={
                    "session_id": sid,
                    "answer": "I would solve this using a hashmap for O(n) lookup.",
                },
                headers={**auth_headers, "Content-Type": "application/json"},
                timeout=90,
            )
            assert r2.status_code == 200, r2.text
            jb = r2.json()
            assert "evaluation" in jb
            done = jb.get("done", False)
            loops += 1
        assert done is True, "interview did not finish after 5 questions"
