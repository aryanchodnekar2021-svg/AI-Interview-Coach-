# AI-Interview-Coach-

An AI-powered Mock Interviewer application built with React (Vite), Express.js, and OpenAI API.

## Project Overview

- **`ai-interview-backend`**: Express backend providing endpoints to generate interview questions and evaluate candidate answers.
- **`ai-interview-frontend`**: Bare React (Vite) frontend providing an interactive interview interface.

## Prerequisites

- Node.js (v18+)
- OpenAI API Key

## Getting Started

### 1. Backend Setup

```bash
cd ai-interview-backend
npm install
```

Create a `.env` file inside `ai-interview-backend/`:

```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend server:

```bash
node server.js
```

Backend runs on `http://localhost:5000`.

### 2. Frontend Setup

```bash
cd ai-interview-frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints

- `POST /generate-questions`: Accepts `{ "role": "React Developer" }` and returns 5 interview questions.
- `POST /evaluate-answer`: Accepts `{ "question": "...", "answer": "..." }` and returns `{ "score": 9, "feedback": "..." }`.

