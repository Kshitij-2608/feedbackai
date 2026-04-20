# FeedbackAI

> **AI-powered conversational feedback collection system** — gathers structured, actionable feedback on AI-generated content through intelligent multi-turn interviews powered by Gemini and a custom-trained ML model.

[![Deploy Status](https://img.shields.io/badge/deployed-Vercel-black?logo=vercel)](https://feedbackai.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## What is FeedbackAI?

FeedbackAI replaces static feedback forms with a dynamic AI interviewer. Users submit an AI-generated output (text, code, image description, etc.), and an intelligent chatbot conducts a structured interview — probing for strengths, weaknesses, and specific improvement suggestions. Every response is classified in real time by a custom-trained DistilRoBERTa model before being passed to Gemini to generate the next question.

### Key Features

- 🎙 **Conversational Feedback** — Multi-turn interview sessions instead of static forms
- 🧠 **Custom ML Classification** — DistilRoBERTa models classify sentiment, topic adherence, response quality, and conversation policy in real time
- 🔁 **Smart Fallback** — ML inference → Gemini API → mock (graceful degradation)
- 📊 **Admin Dashboard** — Review all submissions and session transcripts
- 🌐 **Vercel-Ready** — Frontend as static CDN + backend as serverless functions
- 🔐 **JWT Auth** — Role-based access (ADMIN / USER)

---

## Project Structure

```
AI-CP/
├── frontend/          # Vite + React + Tailwind CSS
├── backend/           # Node.js + Express + Prisma + Neon PostgreSQL
├── ml/                # Python ML workspace (datasets, training, inference)
│   ├── data/          # Raw + processed JSONL datasets
│   ├── training/      # DistilRoBERTa training scripts
│   ├── artifacts/     # Trained model weights (gitignored — train locally)
│   └── serve/         # FastAPI inference server
├── api/               # Vercel serverless entry point (wraps Express)
├── vercel.json        # Vercel build + routing configuration
└── package.json       # Root build scripts
```

---

## Live Demo

> **URL:** https://feedbackai.vercel.app *(deployed on Vercel)*

**Admin login:**
```
Email:    admin@feedbackai.dev
Password: Admin123!
```

---

## Local Development

### Prerequisites
- **Node.js** 20+
- **Python** 3.12 (for ML inference server — optional)
- A **Neon** PostgreSQL database (free tier at [neon.tech](https://neon.tech))
- A **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone
```bash
git clone https://github.com/Kshitij-2608/feedbackai.git
cd feedbackai
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your DATABASE_URL, JWT_SECRET, LLM_API_KEY in .env

npm install
npx prisma generate
npx prisma migrate deploy   # applies migrations to your Neon DB
npm run seed                 # creates the admin user
npm run dev                  # starts on http://localhost:4000
```

### 3. Frontend Setup
```bash
cd frontend
# .env.local already created — points to localhost:4000
npm install
npm run dev                 # starts on http://localhost:5173
```

### 4. ML Inference Server (Optional)
The backend falls back to Gemini API if the ML server is unreachable. Only needed if you want `LLM_PROVIDER_MODE=ml`.

```bash
cd ml

# Create Python 3.12 venv
py -3.12 -m venv .venv312
.venv312\Scripts\pip install -r requirements.txt
.venv312\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cpu

# Build training splits
.venv312\Scripts\python training/build_splits.py \
  --source data/raw/feedback_turn_classification.jsonl \
  --output-dir data/processed/feedback_turns

.venv312\Scripts\python training/build_splits.py \
  --source data/raw/conversation_policy.jsonl \
  --output-dir data/processed/policy

# Train models
.venv312\Scripts\python training/train_multitask.py \
  --train-file data/processed/feedback_turns/train.jsonl \
  --val-file data/processed/feedback_turns/val.jsonl \
  --model-name distilroberta-base \
  --output-dir artifacts/distilroberta-feedback-model \
  --epochs 10

.venv312\Scripts\python training/train_policy_model.py \
  --train-file data/processed/policy/train.jsonl \
  --val-file data/processed/policy/val.jsonl \
  --model-name distilroberta-base \
  --output-dir artifacts/distilroberta-policy-model \
  --epochs 12

# Start inference server
.venv312\Scripts\python -m uvicorn serve.inference_server:app --host 0.0.0.0 --port 8001
```

Then in `backend/.env` set `LLM_PROVIDER_MODE=ml`.

---

## Deploying to Vercel

### 1. Push to GitHub
```bash
git push
```

### 2. Import on Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `Kshitij-2608/feedbackai`
3. Framework Preset: **Other**
4. Root Directory: *(leave blank)*

### 3. Set Environment Variables
| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `DIRECT_URL` | Same as DATABASE_URL |
| `JWT_SECRET` | Strong random string |
| `LLM_PROVIDER_MODE` | `api` |
| `LLM_API_URL` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | Your Gemini API key |
| `LLM_MODEL` | `gemini-2.0-flash` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your Vercel deployment URL |

### 4. Deploy & Seed
After first deploy, run the seed once to create the admin user:
```bash
cd backend && npm run seed
```

---

## ML Model Details

| Model | Architecture | Training Data | Accuracy |
|---|---|---|---|
| Feedback Classifier | DistilRoBERTa (multi-task) | 140 examples | Quality: 92.8%, Topic: 92.8% |
| Conversation Policy | DistilRoBERTa (sequence cls) | 105 examples | 40% val acc (11 classes) |

**Classified dimensions:**
- Sentiment (`positive`, `neutral`, `hesitant`, `frustrated`, `wants_to_stop`)
- Topic adherence (`on_topic`, `off_topic`)
- Continue signal (`continue`, `uncertain`, `stop`)
- Feedback quality (`vague`, `somewhat_actionable`, `highly_actionable`)
- Session stage + themes

**Policy actions:** `greet_opening`, `ask_first_impression`, `probe_strength`, `probe_weakness`, `probe_specific_issue`, `ask_improvement_priority`, `redirect_to_feedback`, `shorten_question`, `empathy_then_probe`, `confirm_end`, `wrap_up`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express, Prisma ORM |
| Database | Neon PostgreSQL (serverless) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| LLM | Gemini 2.0 Flash (OpenAI-compat API) |
| ML | PyTorch, HuggingFace Transformers, FastAPI |
| Hosting | Vercel (frontend + API serverless functions) |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push and open a PR

---

## License

MIT — see [LICENSE](./LICENSE)
