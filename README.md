# PlacementGuide

PlacementGuide is a student-built placement preparation platform designed to help college students prepare for technical and behavioral interviews. It provides tools for resume analysis, technical quizzes, and mock interviews.

## Features

- **Resume Analyzer**: Get an ATS (Applicant Tracking System) score and suggestions for your resume powered by Google Gemini.
- **Quiz Practice**: Practice multiple-choice questions on various technical topics like DSA, SQL, DBMS, and more.
- **Mock Interview**: Simulate real interview sessions with structured technical and behavioral questions.
- **Progress Tracker**: Keep track of your performance in quizzes and mock interviews.
- **Profile Management**: Maintain your academic details and skill set.

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Lucide React
- **Backend**: FastAPI (Python), Motor (Async MongoDB driver)
- **Database**: MongoDB
- **AI Integration**: Google Gemini API (used for Resume Analysis)

## Getting Started

### Prerequisites

- Node.js & npm/yarn
- Python 3.10+
- MongoDB instance (local or Atlas)
- Gemini API Key

### Backend Setup

1. Navigate to the `backend` directory.
2. Create a `.env` file with the following:
   ```env
   MONGO_URL=your_mongodb_url
   DB_NAME=placementguide
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn server:app --port 8000
   ```

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Development

This project was built as a semester project to provide a clean and practical tool for students to prepare for their campus placements.
