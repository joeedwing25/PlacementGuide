# InterviewIQ AI — Backend

FastAPI backend for a placement/internship prep tool: resume analysis, MCQ quizzes,
mock interview practice, an AI coach chat, and a personalized prep roadmap.

## Features

- **Auth** — register/login with JWT access + refresh tokens (cookie-based)
- **Resume analysis** — upload a PDF/DOCX, get an ATS-style score and feedback via Gemini
- **Quiz** — generates MCQ questions on a chosen topic/difficulty, tracks history
- **Mock interview** — adaptive question flow with per-answer evaluation (technical accuracy,
  communication, clarity, etc.)
- **Coach chat** — conversational career advice, personalized using the user's profile
- **Roadmap** — 30/60/90-day prep plan generated from the user's profile
- **Analytics** — aggregate view of quiz/interview performance over time

## Tech stack

- FastAPI + Motor (async MongoDB driver)
- JWT auth (python-jose / PyJWT) with bcrypt password hashing
- Gemini API via the official `google-genai` SDK
- pypdf / python-docx for resume text extraction
- pytest for backend regression tests

## Running locally

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=interviewiq
GEMINI_API_KEY=your_key_here
JWT_SECRET=some_random_secret
```

Then:

```bash
uvicorn server:app --reload
```

API will be available at `http://localhost:8000/api`.

## Tests

```bash
pytest backend/tests/backend_test.py -v
```

Tests hit a running instance of the API (set `REACT_APP_BACKEND_URL` if not on localhost:8000).

## Notes / future improvements

- Resume parsing is plain text extraction; doesn't handle multi-column layouts well
- Coach chat doesn't persist conversation state server-side between calls — history is
  passed back in each request
- TODO: rate-limit the Gemini-backed endpoints (resume analyze, quiz generation) to avoid
  hitting API quotas under load
- TODO: add pagination to quiz/interview history endpoints
