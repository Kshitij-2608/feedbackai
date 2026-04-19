# FeedbackAI Backend

Production-ready backend foundation for the FeedbackAI frontend. This service is designed to be easy to move across devices and straightforward to host later because it relies on environment variables, a relational database, and stateless JWT authentication.

## Tech Stack

- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT auth with role-based access
- Multer for uploads
- Pluggable LLM provider layer

## What It Supports

- Shared auth for `USER` and `ADMIN`
- Submission creation with separate `originalPrompt` and `generatedContent`
- Optional file upload metadata
- Interview session lifecycle
- Polite interviewer orchestration
- Summary-only persistence after session end
- Admin session review, notes, and exports by `inputType` and `sourceModelLabel`

## Environment

Copy `.env.example` to `.env` and update the values.

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLIENT_URL`

Optional for LLM API mode:

- `LLM_PROVIDER_MODE=api`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

If you leave `LLM_PROVIDER_MODE=mock`, the app uses the built-in deterministic interviewer/summarizer logic for development.

## Local Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Hosting Notes

- Use a managed PostgreSQL database for production.
- Store uploaded files in object storage later if you outgrow local disk.
- Keep `CLIENT_URL`, `DATABASE_URL`, `JWT_SECRET`, and any LLM keys in environment variables on your host.
- Since auth is JWT-based and the app is stateless, moving to another machine only requires the repo, environment values, and database access.

## Main API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/submissions`
- `GET /api/submissions`
- `GET /api/submissions/:submissionId`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/message`
- `POST /api/sessions/:sessionId/end`
- `GET /api/summaries/:sessionId`
- `GET /api/admin/sessions`
- `GET /api/admin/sessions/:sessionId`
- `POST /api/admin/sessions/:sessionId/notes`
- `GET /api/admin/exports/summaries`
