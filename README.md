<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

# 🧠 HeuriSense — Intelligent AI Feedback Collection System

**HeuriSense** is a full-stack, AI-powered feedback collection platform that uses a **hybrid local ML + cloud LLM architecture** to conduct intelligent conversational interviews, analyze user sentiment in real-time, and extract structured insights from unstructured feedback data.

> Built as a production-grade system for evaluating AI-generated content across multiple modalities — images, documents, audio, video, and text.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [System Pipeline](#-system-pipeline)
- [ML Model Architecture](#-ml-model-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Admin Dashboard](#-admin-dashboard)
- [Database Schema](#-database-schema)

---

## 🏗 Architecture Overview

HeuriSense employs a **hybrid intelligence architecture** that combines a local transformer-based ML model for real-time context understanding and sentiment analysis with a cloud-hosted Gemini LLM for natural language generation.

```mermaid
graph TB
    subgraph Client["🖥 Frontend (Vanilla JS)"]
        UI[Upload & Interview UI]
        Admin[Admin Dashboard]
    end

    subgraph Server["⚙ FastAPI Backend"]
        API[API Router]
        Auth[JWT Auth Layer]
        Chat[Chat Controller]
    end

    subgraph ML["🧠 Local ML Pipeline"]
        CE[Context Understanding Engine<br/>3-Layer Transformer]
        SA[Sentiment Analyzer<br/>BiLSTM + Attention]
        QS[Quality Scorer]
        FA[Flow Analyzer]
    end

    subgraph Cloud["☁ Cloud LLM"]
        Gemini[Gemini 2.0 Flash API<br/>with Model Fallback Chain]
    end

    subgraph DB["🗄 PostgreSQL (Neon)"]
        Users[(users)]
        Sessions[(sessions)]
        Messages[(messages)]
        Summaries[(session_summaries)]
    end

    UI -->|HTTPS| API
    Admin -->|HTTPS| API
    API --> Auth
    Auth --> Chat
    Chat --> CE
    CE -->|Enriched Context| Gemini
    Chat --> SA
    SA -->|Sentiment Data| Summaries
    Gemini -->|Generated Response| Chat
    Chat --> Messages
    Chat --> Sessions
    Chat --> Summaries
    API --> Users
```

---

## 🔄 System Pipeline

The following flowchart illustrates the complete data pipeline from user input to structured insight extraction:

```mermaid
flowchart TD
    A[👤 User Uploads Content] --> B{Content Type Detection}
    B -->|Image| C1[Base64 Encoding]
    B -->|Document| C2[Text Extraction]
    B -->|Audio/Video| C3[Metadata Capture]
    B -->|Text| C4[Direct Pass-through]

    C1 & C2 & C3 & C4 --> D[Session Initialization]
    D --> E[Context Engine Processing]

    E --> E1[Token Embedding<br/>Sinusoidal Position Encoding]
    E1 --> E2[Multi-Head Self-Attention<br/>4 heads × 3 layers]
    E2 --> E3[Feed-Forward Network<br/>GELU activation]
    E3 --> E4[Context Vector Extraction]
    E4 --> E5[Topic Classification<br/>12 categories]

    E5 --> F[Enriched Context Package]
    F --> G[Gemini LLM API]
    G --> H[AI Response Generation]
    H --> I[Response to User]

    I --> J{Session Complete?}
    J -->|No| K[Log Message + Update Context]
    K --> E

    J -->|Yes| L[Background Processing Thread]
    L --> M[Sentiment Analysis Pipeline]
    M --> M1[BiLSTM Encoding<br/>Forward + Backward]
    M1 --> M2[Attention-Weighted Pooling]
    M2 --> M3[Sentiment Classification<br/>5-class]
    M3 --> M4[Aspect Extraction<br/>8 dimensions]
    M4 --> M5[Emotion Detection<br/>Plutchik's 8 emotions]

    L --> N[Session Summary Generation]
    N --> O[Structured Data Extraction]
    O --> P[(session_summaries Table)]

    M5 --> P

    style E fill:#1a1a2e,stroke:#7c6af7,color:#e8e8f0
    style M fill:#1a1a2e,stroke:#f87171,color:#e8e8f0
    style G fill:#1a1a2e,stroke:#34d399,color:#e8e8f0
```

---

## 🧠 ML Model Architecture

The local ML model (`ml_model/`) is a custom-built NLP pipeline consisting of three core components:

### 1. Context Understanding Engine (`context_engine.py`)

A 3-layer transformer encoder that processes conversational text to extract rich contextual representations.

```mermaid
graph LR
    subgraph Input
        T[Raw Text]
    end

    subgraph Embedding["Token Embedding Layer"]
        TE[Token Hash Embedding<br/>vocab_size=10000]
        PE[Sinusoidal Position<br/>Encoding]
        TE --> ADD1((+))
        PE --> ADD1
    end

    subgraph Transformer["Transformer Encoder × 3"]
        MHA[Multi-Head<br/>Self-Attention<br/>4 heads, d_k=32]
        LN1[Layer Norm + Residual]
        FFN[Feed-Forward<br/>128→512→128<br/>GELU]
        LN2[Layer Norm + Residual]
        MHA --> LN1 --> FFN --> LN2
    end

    subgraph Output
        CV[Context Vector<br/>d=128]
        TC[Topic Classification<br/>12 categories]
    end

    T --> Embedding
    ADD1 --> Transformer
    LN2 --> CV
    CV --> TC
```

| Parameter | Value |
|-----------|-------|
| Model Dimension (`d_model`) | 128 |
| Attention Heads | 4 |
| Transformer Layers | 3 |
| FFN Hidden Size | 512 |
| Vocabulary Size | 10,000 |
| Max Sequence Length | 512 |
| Activation Function | GELU |

**Topic Categories:** `quality_feedback`, `usability_concern`, `feature_request`, `performance_issue`, `positive_experience`, `negative_experience`, `comparison`, `suggestion`, `question`, `confusion`, `satisfaction`, `frustration`

---

### 2. Sentiment Analyzer (`sentiment_analyzer.py`)

A BiLSTM + Attention architecture with hybrid neural-lexicon scoring for robust sentiment classification.

```mermaid
graph TD
    subgraph Input
        TEXT[User Message]
    end

    subgraph Preprocessing
        TOK[Tokenization<br/>+ Lowercasing]
        EMB[Character-level<br/>Embedding]
    end

    subgraph BiLSTM["Bidirectional LSTM"]
        FWD[Forward LSTM<br/>hidden=64]
        BWD[Backward LSTM<br/>hidden=64]
        CONCAT[Concatenate<br/>d=128]
        FWD --> CONCAT
        BWD --> CONCAT
    end

    subgraph Attention["Attention Mechanism"]
        ATT[Sentiment Attention Head]
        CTX[Context Vector]
    end

    subgraph Analysis["Multi-Head Analysis"]
        SENT[Sentiment Classifier<br/>5 classes]
        ASP[Aspect Extractor<br/>8 dimensions]
        EMO[Emotion Detector<br/>8 emotions]
        LEX[Lexicon Features<br/>Hybrid Scoring]
    end

    subgraph Output
        RES[Combined Analysis<br/>Result]
    end

    TEXT --> TOK --> EMB --> BiLSTM
    CONCAT --> ATT --> CTX
    CTX --> SENT & ASP & EMO
    TEXT --> LEX
    SENT & ASP & EMO & LEX --> RES
```

**Sentiment Classes:** Very Negative → Negative → Neutral → Positive → Very Positive

**Aspect Dimensions:** accuracy, speed, quality, usability, reliability, clarity, completeness, relevance

**Emotion Model (Plutchik):** joy, trust, anticipation, surprise, sadness, disgust, anger, fear

**Hybrid Scoring Formula:**
```
combined_polarity = 0.6 × neural_polarity + 0.4 × lexicon_polarity
```

---

### 3. Pipeline Orchestrator (`pipeline.py`)

Coordinates the full ML pipeline, combining context understanding, sentiment analysis, quality scoring, and conversation flow analysis into a unified processing interface.

```mermaid
sequenceDiagram
    participant User
    participant Pipeline as HeuriSense Pipeline
    participant CE as Context Engine
    participant SA as Sentiment Analyzer
    participant QS as Quality Scorer
    participant LLM as Gemini API

    User->>Pipeline: Send message
    Pipeline->>CE: Extract context vector
    CE-->>Pipeline: Context + Topics
    Pipeline->>SA: Analyze sentiment
    SA-->>Pipeline: Sentiment + Emotions
    Pipeline->>QS: Score quality
    QS-->>Pipeline: Quality metrics
    Pipeline->>LLM: Enriched context + prompt
    LLM-->>Pipeline: Generated response
    Pipeline-->>User: AI Response
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla JS, CSS3 | SPA with glassmorphism design |
| **Backend** | FastAPI (Python 3.10+) | REST API, WebSocket-ready |
| **ML Engine** | NumPy (custom) | Context understanding, sentiment analysis |
| **LLM** | Google Gemini 2.0 Flash | Conversational response generation |
| **Database** | PostgreSQL (Neon) | Persistent storage, analytics |
| **Auth** | JWT + bcrypt | Secure authentication |
| **Deployment** | Vercel (Serverless) | Production hosting |

---

## 📁 Project Structure

```
feedback-heurisense/
├── main.py                  # FastAPI application entrypoint
├── chatbot.py               # Conversation state manager & session orchestration
├── llm.py                   # Gemini API integration with model fallback chain
├── auth.py                  # JWT authentication & admin authorization
├── db.py                    # PostgreSQL schema, migrations & admin seeding
├── models.py                # Pydantic request/response models
│
├── ml_model/                # 🧠 Local ML Pipeline
│   ├── __init__.py
│   ├── context_engine.py    # Transformer-based context understanding
│   ├── sentiment_analyzer.py # BiLSTM sentiment + aspect + emotion analysis
│   └── pipeline.py          # Unified ML orchestrator
│
├── static/                  # Frontend assets
│   ├── index.html           # SPA entry point
│   ├── style.css            # Luminous Void design system
│   └── script.js            # Client-side application logic
│
├── requirements.txt         # Python dependencies
├── vercel.json              # Vercel deployment configuration
├── .python-version          # Python version pin (3.12)
└── .env                     # Environment variables (not committed)
```

---

## ✨ Features

### For Users
- 🎨 **Multi-modal Content Upload** — Support for images, documents, audio, video, and text (up to 10 MB)
- 🤖 **AI-Powered Conversational Interviews** — Natural, context-aware feedback collection
- 📊 **Session Summaries** — Auto-generated structured summaries with ratings, sentiment, and key insights
- 📋 **Personal Dashboard** — View all past sessions, ratings, and statuses
- 🔐 **Secure Authentication** — JWT-based login with bcrypt password hashing
- ⏹ **Force End Session** — End any session at any time and get an instant summary

### For Admins
- 📈 **KPI Dashboard** — Total interactions, avg. confidence score, completion rate, total users
- 🗂 **Content Type Filtering** — Filter sessions by modality (image, document, audio, video, text)
- 📑 **Session Analytics** — Structured summaries with sentiment, strengths, weaknesses, and suggestions
- 🔒 **Admin-Only Access** — Protected routes with role-based authorization

### ML Capabilities
- 🧠 **Real-time Context Understanding** — Transformer encoder extracts topic and semantic context
- 💬 **Sentiment Analysis** — BiLSTM + Attention with hybrid neural-lexicon scoring
- 🎯 **Aspect-Based Analysis** — 8-dimension quality assessment per response
- 😊 **Emotion Detection** — Plutchik's 8 primary emotions per message
- 📉 **Sentiment Trajectory Tracking** — Detect mood shifts across conversation turns

---

## ⚡ Setup & Installation

### Prerequisites

- Python 3.10+
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))
- A PostgreSQL database (e.g., [Neon](https://neon.tech))

### 1. Clone the repository

```bash
git clone https://github.com/Kshitij-2608/feedbackai.git
cd feedbackai
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=your_random_secret_key
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for LLM responses |
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `JWT_SECRET` | Secret key for JWT token signing |

---

## 🚀 Running Locally

```bash
uvicorn main:app --reload --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## ☁ Deployment

The application is deployed on **Vercel** as a Python serverless function.

### Vercel Configuration

The `vercel.json` routes all requests through the FastAPI application, which handles both API endpoints and static file serving:

```json
{
  "builds": [{ "src": "main.py", "use": "@vercel/python" }],
  "routes": [{ "src": "/(.*)", "dest": "/main.py" }]
}
```

### Environment Variables on Vercel

Add all three environment variables (`GEMINI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`) in:

**Vercel Dashboard → Project Settings → Environment Variables**

### Model Fallback Chain

To ensure high availability under free-tier rate limits, the system implements automatic model fallback:

```
gemini-2.0-flash (1500 RPD) → gemini-2.0-flash-lite → gemini-2.5-flash (20 RPD)
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | ✗ | Create new user account |
| `POST` | `/api/auth/login` | ✗ | Login and receive JWT |
| `GET` | `/api/auth/me` | ✓ | Get current user info |
| `PUT` | `/api/auth/me` | ✓ | Update profile |
| `GET` | `/api/chat/init` | ✓ | Initialize interview session |
| `POST` | `/api/chat` | ✓ | Send message, get AI response |
| `POST` | `/api/chat/end` | ✓ | Force-end session |
| `GET` | `/api/summary/{id}` | ✓ | Get session summary |
| `GET` | `/api/dashboard` | ✓ | User's session history |
| `GET` | `/api/admin/stats` | 🔒 | Admin KPI statistics |
| `GET` | `/api/admin/sessions` | 🔒 | All sessions (filterable) |

🔒 = Admin-only endpoint

---

## 👨‍💼 Admin Dashboard

The admin dashboard is accessible only to the designated admin account:

| Field | Value |
|-------|-------|
| **Email** | `admin@heurisense.ai` |
| **Password** | `HeuriAdmin@2026` |

### Admin KPIs
- **Total Interactions** — Total feedback sessions across all users
- **Avg. Confidence Score** — Average AI model confidence rating
- **Completion Rate** — Percentage of sessions that reached completion
- **Total Users** — Unique participants in the system

---

## 🗄 Database Schema

```mermaid
erDiagram
    users {
        int id PK
        varchar name
        varchar email UK
        text password_hash
        boolean is_admin
        timestamptz created_at
    }

    sessions {
        int id PK
        varchar session_id UK
        int user_id FK
        varchar state
        varchar content_type
        int overall_rating
        text summary_json
        timestamptz created_at
        timestamptz completed_at
    }

    messages {
        int id PK
        varchar session_id
        varchar role
        text content
        timestamptz created_at
    }

    session_summaries {
        int id PK
        varchar session_id UK
        int user_id FK
        varchar content_type
        varchar sentiment
        int rating
        text user_interest
        text interaction_summary
        text_arr model_strengths
        text_arr model_weaknesses
        text_arr key_issues
        text suggestions
        jsonb conversation_highlights
        timestamptz created_at
    }

    users ||--o{ sessions : "creates"
    users ||--o{ session_summaries : "owns"
    sessions ||--o{ messages : "contains"
    sessions ||--|| session_summaries : "produces"
```

---

## 📄 License

This project is developed for academic evaluation purposes.

---

<p align="center">
  <strong>Built with 🧠 by the HeuriSense Team</strong>
</p>
