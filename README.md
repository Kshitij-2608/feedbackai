<div align="center">

# 🧠 HeuriSense — AI Feedback Collection System

**A hybrid-architecture conversational AI platform that combines on-device NLP models with cloud-based LLMs to collect structured, high-quality feedback on AI-generated content.**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.116-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-API-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![HuggingFace](https://img.shields.io/badge/🤗_Transformers-Local_Models-FFD21E?style=flat-square)](https://huggingface.co)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![Deployed](https://img.shields.io/badge/Live-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://feedbackai-beta.vercel.app)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Hybrid Model Architecture](#-hybrid-model-architecture)
- [Local Model — On-Device NLP Engine](#-local-model--on-device-nlp-engine)
- [Cloud Model — Gemini 2.5 Flash](#-cloud-model--gemini-25-flash)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Setup & Installation](#-setup--installation)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)

---

## 🎯 Overview

HeuriSense is a controlled conversational AI feedback system that acts as an **intelligent interviewer**, collecting structured user feedback on AI-generated content (images, documents, audio, video, and text). 

The system uses a **hybrid architecture** that splits NLP workload between:
- **Local models** (DistilRoBERTa + DistilBERT) for real-time context understanding
- **Cloud LLM** (Gemini 2.5 Flash) for conversational response generation

This design minimizes API latency, reduces token usage, and ensures that the Gemini model receives pre-analyzed context for every user turn — resulting in more accurate, empathetic, and contextually appropriate responses.

---

## 🏗 System Architecture

```mermaid
graph TD
    A[Frontend: Glassmorphism SPA] -->|HTTP POST /api/chat| B(FastAPI Backend)
    A -->|File Upload ≤10MB| B
    B -->|User Message Text| C[🧠 Local NLP Engine<br/>DistilRoBERTa + DistilBERT]
    C -->|Intent + Sentiment + Topic| D{Context Enrichment}
    D -->|Enriched Prompt| E[☁️ Gemini 2.5 Flash API]
    E -->|Conversational Response| B
    B -->|Stores State & Logs| F[(PostgreSQL / Neon DB)]
    B -->|On Session End| G[Background Thread]
    G -->|Generates Summary| E
    G -->|Writes Structured Data| H[(session_summaries Table)]

    style C fill:#1a1a2e,stroke:#a8a4ff,stroke-width:2px,color:#edecfd
    style E fill:#1a1a2e,stroke:#4285F4,stroke-width:2px,color:#edecfd
    style D fill:#0c0e18,stroke:#9492ff,stroke-width:2px,color:#a8a4ff
```

### Data Flow Per User Turn

```
User Message
    │
    ▼
┌─────────────────────────────────┐
│  LOCAL MODEL (on-device, ~50ms) │
│  ├── Intent Classification      │
│  │   (DistilRoBERTa zero-shot)  │
│  ├── Sentiment Analysis         │
│  │   (DistilBERT SST-2)        │
│  └── Topic Extraction           │
│      (DistilRoBERTa zero-shot)  │
└────────────┬────────────────────┘
             │ {intent, sentiment, topic}
             ▼
┌─────────────────────────────────┐
│  CONTEXT ENRICHMENT             │
│  Injects local NLP analysis     │
│  into the Gemini prompt as      │
│  structured context metadata    │
└────────────┬────────────────────┘
             │ Enriched prompt + history
             ▼
┌─────────────────────────────────┐
│  GEMINI 2.5 FLASH (cloud API)  │
│  Generates contextually-aware   │
│  conversational response        │
└─────────────────────────────────┘
```

---

## 🧠 Hybrid Model Architecture

### Local Model — On-Device NLP Engine

The local NLP engine (`local_model.py`) performs **turn-level analysis** entirely on-device before any data reaches the cloud API. This serves three purposes:

| Function | Model | Purpose |
|---|---|---|
| **Intent Classification** | `cross-encoder/nli-distilroberta-base` (Zero-Shot) | Classifies user intent into 9 categories: giving feedback, asking questions, expressing frustration, giving praise, requesting help, going off-topic, providing ratings, describing issues, making suggestions |
| **Sentiment Analysis** | `distilbert-base-uncased-finetuned-sst-2-english` | Three-class sentiment detection (positive / neutral / negative) with confidence scoring |
| **Topic Extraction** | `cross-encoder/nli-distilroberta-base` (Zero-Shot) | Identifies the primary feedback topic from 10 categories: image quality, text generation, audio output, video generation, response accuracy, speed, UI, overall experience, content relevance, model reliability |

#### Why Local Models?

1. **Latency Reduction** — Local inference completes in ~50ms vs 500ms+ for an API roundtrip
2. **Token Efficiency** — Pre-analyzed context lets Gemini skip re-analysis, reducing prompt tokens by ~15-20%
3. **Privacy** — Sentiment and intent never leave the device
4. **Offline Capability** — Context understanding works without internet; only response generation needs the API
5. **Cost Optimization** — Reduces Gemini API calls for classification tasks

#### Local Model Output Format

```json
{
  "intent": "expressing frustration",
  "intent_confidence": 0.92,
  "sentiment": "negative",
  "sentiment_confidence": 0.97,
  "topic": "image quality",
  "topic_confidence": 0.85
}
```

This structured output is injected directly into the Gemini prompt, enabling the cloud model to calibrate tone and response strategy without re-deriving these signals.

---

### Cloud Model — Gemini 2.5 Flash

The Gemini API handles tasks that require **generative reasoning**:

| Function | Description |
|---|---|
| **Conversational Response Generation** | Produces natural, empathetic follow-up questions guided by the master prompt and local NLP context |
| **Image/File Analysis** | Multimodal understanding of uploaded content (images sent as inline base64) |
| **Session Summary Generation** | Post-interview structured JSON extraction: sentiment, rating, key issues, strengths, weaknesses |
| **Safety Classification** | Content moderation and off-topic detection (redundant layer over local intent) |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Local NLP** | HuggingFace Transformers, DistilRoBERTa, DistilBERT, PyTorch |
| **Cloud LLM** | Google Gemini 2.5 Flash (`google-genai` SDK) |
| **Database** | PostgreSQL (Neon serverless) via `psycopg2` |
| **Auth** | JWT (python-jose), bcrypt password hashing with SHA-256 pre-hash |
| **Frontend** | Vanilla HTML/CSS/JS, Glassmorphism dark theme, Material Icons |
| **Deployment** | Vercel (serverless Python runtime) |

---

## 🗄 Database Schema

### `users`
| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | Auto-incrementing user ID |
| name | VARCHAR(100) | Display name |
| email | VARCHAR(150) UNIQUE | Login email |
| password_hash | TEXT | bcrypt hash (SHA-256 pre-hashed) |
| is_admin | BOOLEAN | Admin role flag |
| created_at | TIMESTAMPTZ | Registration timestamp |

### `sessions`
| Column | Type | Description |
|---|---|---|
| session_id | VARCHAR(100) UNIQUE | Client-generated session identifier |
| user_id | INTEGER FK | Reference to users table |
| state | VARCHAR(20) | `ACTIVE` or `END` |
| content_type | VARCHAR(20) | `image`, `document`, `audio`, `video`, `text` |
| overall_rating | INTEGER | 1-5 extracted rating |
| summary_json | TEXT | Full JSON summary blob |

### `session_summaries` (Structured Analytics)
| Column | Type | Description |
|---|---|---|
| session_id | VARCHAR(100) FK | Links to sessions table |
| sentiment | VARCHAR(30) | Very Positive → Very Negative |
| rating | INTEGER | 1-5 scale |
| user_interest | TEXT | What the user was evaluating |
| model_strengths | TEXT[] | Array of identified model strengths |
| model_weaknesses | TEXT[] | Array of identified model weaknesses |
| key_issues | TEXT[] | Main problems raised by user |
| suggestions | TEXT | Improvement suggestions |
| conversation_highlights | JSONB | Key exchanges (role + message pairs) |

### `messages`
| Column | Type | Description |
|---|---|---|
| session_id | VARCHAR(100) | Links to session |
| role | VARCHAR(10) | `AI` or `USER` |
| content | TEXT | Message text |

---

## 🚀 Setup & Installation

### Prerequisites

- Python 3.12+
- Google Gemini API Key
- PostgreSQL database (e.g., [Neon](https://neon.tech))

### 1. Clone & Install

```bash
git clone https://github.com/Kshitij-2608/feedbackai.git
cd feedbackai

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Install local model dependencies
pip install transformers torch
```

### 2. Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your_secret_key
```

### 3. Run

```bash
uvicorn main:app --reload
```

The app will be available at [http://localhost:8000](http://localhost:8000).

On first startup:
- Database tables are auto-created
- Admin account is seeded
- Local NLP models are downloaded from HuggingFace (~500MB first run, cached after)

### 4. Local Model Verification

To verify the local NLP engine independently:

```bash
python local_model.py
```

Expected output:
```
[LocalModel] Loading DistilRoBERTa zero-shot classifier...
[LocalModel] Loading DistilBERT sentiment model...

============================================================
Input: The image quality is really poor, it looks blurry and distorted
  intent: describing an issue
  intent_confidence: 0.8734
  sentiment: negative
  sentiment_confidence: 0.9891
  topic: image quality
  topic_confidence: 0.8521
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | — | Create account |
| `POST` | `/api/auth/login` | — | Login, returns JWT |
| `GET` | `/api/auth/me` | Bearer | Get user profile |
| `PUT` | `/api/auth/me` | Bearer | Update profile |
| `GET` | `/api/chat/init` | — | Initialize interview session |
| `POST` | `/api/chat` | — | Send message + optional file |
| `GET` | `/api/summary/{id}` | — | Get session summary |
| `GET` | `/api/dashboard` | Bearer | User's session history |
| `GET` | `/api/admin/stats` | Admin | Aggregated platform stats |
| `GET` | `/api/admin/sessions` | Admin | All sessions (filterable) |

---

## 📁 Project Structure

```
feedbackai/
├── main.py              # FastAPI application & route definitions
├── chatbot.py           # Conversation state manager & session logic
├── llm.py               # Gemini API integration & prompt engineering
├── local_model.py       # On-device NLP engine (DistilRoBERTa + DistilBERT)
├── auth.py              # JWT authentication & user management
├── db.py                # PostgreSQL connection & schema management
├── models.py            # Pydantic request/response models
├── requirements.txt     # Python dependencies
├── vercel.json          # Vercel deployment configuration
├── .python-version      # Python version pin (3.12)
├── .env                 # Environment variables (not tracked)
└── static/
    ├── index.html       # Single-page application (SPA)
    ├── style.css        # Glassmorphism dark theme (Luminous Void design system)
    └── script.js        # Client-side logic & API integration
```

---

<div align="center">

**Built with ❤️ using FastAPI, HuggingFace Transformers, and Google Gemini**

</div>
