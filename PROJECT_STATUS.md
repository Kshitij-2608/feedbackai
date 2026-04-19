# FeedbackAI — Project Status

> Last updated: 2026-04-19

---

## ✅ Current Status: Fully Functional — Ready for Vercel Deployment

All core systems are operational and end-to-end tested locally.

---

## Completed Work

### Phase 1 — ML Intelligence Layer
| Item | Status |
|---|---|
| Feedback classification dataset (120 examples) | ✅ Done |
| Conversation policy dataset (60 examples) | ✅ Done |
| Multi-task feedback model trained (distilroberta-base, 5 epochs) | ✅ Done |
| Policy model trained (distilroberta-base, 8 epochs) | ✅ Done |
| FastAPI inference server (`ml/serve/inference_server.py`) | ✅ Done |
| Model loader with lazy singleton (`ml/serve/model_loader.py`) | ✅ Done |

### Phase 2 — Backend
| Item | Status |
|---|---|
| Neon PostgreSQL database connected | ✅ Done |
| Prisma migrations applied to Neon | ✅ Done |
| Admin user seeded (`admin@feedbackai.dev` / `Admin123!`) | ✅ Done |
| `ml` provider mode in `llm.provider.js` | ✅ Done |
| Gemini API wired via OpenAI-compatible endpoint | ✅ Done |
| Graceful fallback: ML → Gemini API | ✅ Done |
| CORS updated for Vercel domains | ✅ Done |
| DB retry + startup warmup for Neon cold starts | ✅ Done |

### Phase 3 — Frontend
| Item | Status |
|---|---|
| Role-aware login redirect (admin→dashboard, user→upload) | ✅ Done |
| Rich empty-state in Dashboard | ✅ Done |
| Relative `/api` base URL for Vercel compatibility | ✅ Done |
| `frontend/.env.local` for local dev | ✅ Done |

### Phase 4 — Deployment Prep
| Item | Status |
|---|---|
| `vercel.json` configured (build + rewrites) | ✅ Done |
| `api/index.js` Vercel serverless handler | ✅ Done |
| Root `package.json` for Vercel dep resolution | ✅ Done |
| `.gitignore` updated (artifacts, venv, uploads) | ✅ Done |

---

## Architecture

```
Vercel (same domain)
├── frontend/dist/          ← Static Vite build (served by Vercel CDN)
└── api/index.js            ← Serverless Express handler (all /api/* routes)
         │
         ├── Neon PostgreSQL (cloud, free tier)
         ├── Gemini API (LLM_PROVIDER_MODE=api, via OpenAI compat endpoint)
         └── ML Inference Server (optional, local only / self-hosted)
```

The ML inference server (FastAPI/Python) is **local/self-hosted only** — it cannot run on Vercel. When `LLM_PROVIDER_MODE=ml` but the server is unreachable, the backend gracefully falls back to Gemini API mode.

---

## Running Locally

### Backend
```powershell
cd backend
# First time only:
npm install
npx prisma generate

# Every time:
npm run dev
```

### Frontend
```powershell
cd frontend
# First time only:
npm install

# Every time:
npm run dev
# Opens http://localhost:5173
```

### ML Inference Server (optional)
```powershell
cd ml
# First time only: create venv with Python 3.12
py -3.12 -m venv .venv312
.venv312\Scripts\pip install -r requirements.txt
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Train models (first time):
.venv312\Scripts\python training\train_multitask.py \
  --train-file data/processed/feedback_turns/train.jsonl \
  --val-file data/processed/feedback_turns/val.jsonl \
  --output-dir artifacts/distilroberta-feedback-model

.venv312\Scripts\python training\train_policy_model.py \
  --train-file data/processed/policy/train.jsonl \
  --val-file data/processed/policy/val.jsonl \
  --output-dir artifacts/distilroberta-policy-model

# Start server:
.venv312\Scripts\python -m uvicorn serve.inference_server:app --host 0.0.0.0 --port 8001
```

Then set `LLM_PROVIDER_MODE=ml` in `backend/.env` and restart the backend.

---

## Deploying to Vercel

### 1. Push to GitHub
```bash
git init   # if not already
git add .
git commit -m "Initial FeedbackAI deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import Git Repo
2. Select your repo
3. Vercel auto-detects `vercel.json` — no framework needed
4. **Add Environment Variables** (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-...neon.tech:5432/neondb?sslmode=require&connect_timeout=20` |
| `DIRECT_URL` | Same as DATABASE_URL |
| `JWT_SECRET` | Strong random string |
| `LLM_PROVIDER_MODE` | `api` |
| `LLM_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | Your Gemini API key |
| `LLM_MODEL` | `gemini-2.0-flash` |
| `CLIENT_URL` | `https://your-project.vercel.app` |
| `NODE_ENV` | `production` |

5. Deploy!

### 3. After Deploy
Run Prisma migration against Neon (one-time):
```bash
cd backend
npx prisma migrate deploy
npm run seed
```

---

## Credentials (Local & Neon Dev)
- Admin: `admin@feedbackai.dev` / `Admin123!`
- Neon DB: `ep-broad-bonus-aoe0ezun-pooler.c-2.ap-southeast-1.aws.neon.tech`

---

## Open Items
- [ ] Register a custom domain on Vercel (optional)
- [ ] Upload file storage → replace local `uploads/` with Vercel Blob or Cloudinary
- [ ] Rate limiting (express-rate-limit) for production hardening
- [ ] Set up Neon DB branching for staging vs. production
