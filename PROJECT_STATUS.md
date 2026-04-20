# FeedbackAI — Project Status

> Last updated: 2026-04-20

---

## ✅ Current Status: Deployed on Vercel — Debugging DB Connection

| Service | Status | URL/Notes |
|---|---|---|
| **Frontend** | ✅ Live | https://feedbackai.vercel.app |
| **Backend API** | ✅ Deployed | `/api/*` via Vercel serverless |
| **Neon PostgreSQL** | ✅ Provisioned | Singapore region, free tier |
| **Gemini AI** | ✅ Wired | `gemini-2.0-flash` via OpenAI-compat endpoint |
| **ML Models** | ✅ Trained | `distilroberta-feedback-model` + `distilroberta-policy-model` |
| **GitHub** | ✅ Pushed | https://github.com/Kshitij-2608/feedbackai |

---

## 🚧 Recent Fixes (2026-04-20)

| Fix | Details |
|---|---|
| **Vite build on Vercel** | Added `--include=dev` to frontend `npm install` in vercel-build script |
| **500 on login/signup** | `api/index.js` switched from dynamic URL import to static import; added `dotenv.config()` first |
| **React error #31** | `getApiErrorMessage` hardened to always return a string, not a Prisma `{code,message}` object |
| **Prisma binary mismatch** | Added `binaryTargets = ["native", "debian-openssl-3.0.x"]` to schema.prisma so Vercel (Linux) gets the right engine |
| **Error middleware** | Added Prisma error code mapping (P2002, P1001, P1008) with user-friendly messages |

---

## Completed Work

### Phase 1 — ML Intelligence Layer ✅
| Item | Result |
|---|---|
| Feedback classification dataset | 140 examples (120 original + 20 new edge cases) |
| Conversation policy dataset | 105 examples (60 original + 45 new edge cases) |
| New edge cases added | Evasion, topic change, hostility, confusion, minimal responses, off-topic redirects |
| Feedback model trained | DistilRoBERTa, 10 epochs: quality 92.8%, topic 92.8%, continue 85.7% |
| Policy model trained | DistilRoBERTa, 12 epochs: loss 2.35 → 0.65 |
| FastAPI inference server | `ml/serve/inference_server.py` on port 8001 |
| ML → API fallback | Automatic when inference server unreachable |

### Phase 2 — Backend ✅
| Item | Status |
|---|---|
| Neon PostgreSQL provisioned | ✅ `ep-broad-bonus-aoe0ezun-pooler` (Singapore) |
| Prisma migrations applied | ✅ `20260419121029_init` |
| Admin user seeded | ✅ `admin@feedbackai.dev` |
| Gemini API integration | ✅ `gemini-2.0-flash` via OpenAI-compat endpoint |
| ML/API/mock provider modes | ✅ Switchable via `LLM_PROVIDER_MODE` env var |
| CORS for Vercel domains | ✅ Regex allows `*.vercel.app` |
| DB startup warmup | ✅ `prisma.$connect()` on server start |
| Error middleware hardened | ✅ Prisma codes → friendly messages, always string |

### Phase 3 — Frontend ✅
| Item | Status |
|---|---|
| Login / Signup flows | ✅ Role-aware redirect (ADMIN→dashboard, USER→upload) |
| Admin Dashboard | ✅ Sessions, submissions, admin notes |
| Interview page | ✅ Real-time chat with AI interviewer |
| Summary page | ✅ Post-session analysis |
| Relative `/api` base URL | ✅ Works on both localhost and Vercel |
| Error handling hardened | ✅ `getApiErrorMessage` always returns string |

### Phase 4 — Deployment ✅
| Item | Status |
|---|---|
| `vercel.json` configured | ✅ Build + rewrites + function config |
| `api/index.js` serverless handler | ✅ Static imports, dotenv first |
| Prisma Linux binary target | ✅ `debian-openssl-3.0.x` |
| `.gitignore` clean | ✅ No secrets, no artifacts, no venv |
| `.env.example` files | ✅ Both backend and frontend |
| `CREDENTIALS.md` | ✅ All service info documented |
| GitHub pushed | ✅ 94 files, 3 commits |

---

## Architecture

```
Vercel (feedbackai.vercel.app)
├── CDN → frontend/dist/        ← Vite + React build
└── Serverless → api/index.js   ← Express wrapped for Vercel
         │
         ├── Neon PostgreSQL (cloud, Singapore, free tier)
         ├── Gemini 2.0 Flash (LLM_PROVIDER_MODE=api) ← production
         └── ML Inference Server (optional, local only)
                  ├── distilroberta-feedback-model (quality/topic/sentiment)
                  └── distilroberta-policy-model (conversation policy)
```

---

## Running Locally

### Backend
```powershell
cd backend
npm install
npx prisma generate
npm run dev          # http://localhost:4000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173 (auto-proxies to :4000)
```

### ML Server (optional)
```powershell
cd ml
.venv312\Scripts\python -m uvicorn serve.inference_server:app --host 0.0.0.0 --port 8001
# Then set LLM_PROVIDER_MODE=ml in backend/.env
```

---

## Vercel Environment Variables Required

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooler connection string |
| `DIRECT_URL` | Same as DATABASE_URL |
| `JWT_SECRET` | Strong random string |
| `LLM_PROVIDER_MODE` | `api` |
| `LLM_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | Gemini API key |
| `LLM_MODEL` | `gemini-2.0-flash` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://feedbackai.vercel.app` |

---

## Open Items

- [ ] Verify login/signup work on production after latest push (Prisma binary fix)
- [ ] Set `CLIENT_URL` in Vercel after confirming final deployment URL
- [ ] Upload file storage → replace local `uploads/` with Vercel Blob or Cloudinary
- [ ] Rate limiting (`express-rate-limit`) for production hardening
- [ ] Host ML inference server separately (Render/Railway) for `LLM_PROVIDER_MODE=ml` on prod
