# FeedbackAI — Credentials & Access Guide

> ⚠️ **DO NOT COMMIT** real production secrets to this file.
> This file documents the structure of credentials — actual secrets are in `backend/.env` (gitignored).

---

## 🌐 Live Deployment (Vercel)

| | |
|---|---|
| **Production URL** | https://feedbackai.vercel.app |
| **GitHub Repo** | https://github.com/Kshitij-2608/feedbackai |

---

## 👤 Admin Account

| Field | Value |
|---|---|
| **Email** | `admin@feedbackai.dev` |
| **Password** | `Admin123!` |
| **Role** | `ADMIN` |

> Created automatically by `npm run seed` against the configured `DATABASE_URL`.
> To re-seed after a DB wipe: `cd backend && npm run seed`

---

## 🗄️ Database (Neon PostgreSQL)

| Field | Value |
|---|---|
| **Provider** | Neon (free tier) |
| **Region** | `ap-southeast-1` (Singapore) |
| **Project** | `ep-broad-bonus-aoe0ezun` |
| **Database** | `neondb` |
| **Pooler host** | `ep-broad-bonus-aoe0ezun-pooler.c-2.ap-southeast-1.aws.neon.tech` |
| **User** | `neondb_owner` |
| **Dashboard** | https://console.neon.tech |

> ⚠️ The actual password is in `backend/.env` — never stored in this file.

**Connection string format:**
```
postgresql://neondb_owner:<PASSWORD>@ep-broad-bonus-aoe0ezun-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=20
```

---

## 🤖 Gemini API

| Field | Value |
|---|---|
| **Provider** | Google AI Studio |
| **Model** | `gemini-2.0-flash` |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| **Dashboard** | https://aistudio.google.com/apikey |

> ⚠️ API key is stored only in `backend/.env` and Vercel environment variables.

---

## 🔑 JWT Secret

Used to sign/verify authentication tokens.

```
backend/.env  →  JWT_SECRET=<strong-random-string>
```

Generate a strong one:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## ⚙️ Vercel Environment Variables

Set these in: **Vercel Dashboard → Project → Settings → Environment Variables**

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooler connection string (with `connect_timeout=20`) |
| `DIRECT_URL` | Same as DATABASE_URL |
| `JWT_SECRET` | Strong random string for token signing |
| `LLM_PROVIDER_MODE` | `api` (uses Gemini) or `ml` (uses local inference server) |
| `LLM_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | Your Gemini API key |
| `LLM_MODEL` | `gemini-2.0-flash` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your Vercel deployment URL (e.g. `https://feedbackai.vercel.app`) |

---

## 🧠 ML Inference Server (Local Only)

The ML server **cannot run on Vercel** — it requires a persistent Python process.

| Field | Value |
|---|---|
| **Local URL** | `http://localhost:8001` |
| **Framework** | FastAPI + Uvicorn |
| **Models** | `ml/artifacts/distilroberta-feedback-model`, `ml/artifacts/distilroberta-policy-model` |

To enable: set `LLM_PROVIDER_MODE=ml` in `backend/.env` and start the inference server.
If unreachable, the backend **automatically falls back to Gemini API**.

---

## 🔄 Seeding / Re-seeding

If you reset the database or need to recreate the admin user:

```bash
cd backend
npm run seed
```

Default admin credentials are set in `backend/prisma/seed.js` and overridden by:
```
DEFAULT_ADMIN_EMAIL=admin@feedbackai.dev
DEFAULT_ADMIN_PASSWORD=Admin123!
```
