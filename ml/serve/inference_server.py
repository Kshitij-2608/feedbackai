"""
inference_server.py — FastAPI inference server for FeedbackAI in-house models.

Exposes two endpoints consumed by the backend session service:

  POST /analyze-turn
    Input : { input_type, source_model_label, session_stage,
              original_prompt, generated_content, recent_context, latest_user_message }
    Output: { sentiment, topic, continue_signal, feedback_quality, session_stage, themes }

  POST /select-policy
    Input : { session_stage, recent_context, model_signals }
    Output: { policy }

  GET /health
    Returns { status: "ok", device: "cpu" | "cuda" }

Run from the ml/ directory:
    uvicorn serve.inference_server:app --host 0.0.0.0 --port 8001 --reload
"""

import sys
from pathlib import Path

# Make ml/ importable so training.label_maps and training.train_multitask resolve.
ML_ROOT = Path(__file__).parent.parent
if str(ML_ROOT) not in sys.path:
    sys.path.insert(0, str(ML_ROOT))

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from serve.model_loader import get_feedback_model, get_policy_model

app = FastAPI(
    title="FeedbackAI Inference Server",
    description="In-house ML inference for multi-task feedback analysis and conversation policy selection.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ContextTurn(BaseModel):
    role: str
    text: str


class AnalyzeTurnRequest(BaseModel):
    input_type: str
    source_model_label: str
    session_stage: str
    original_prompt: str
    generated_content: str
    recent_context: list[ContextTurn]
    latest_user_message: str


class AnalyzeTurnResponse(BaseModel):
    sentiment: str
    topic: str
    continue_signal: str
    feedback_quality: str
    session_stage: str
    themes: list[str]


class ModelSignals(BaseModel):
    sentiment: str
    topic: str
    continue_signal: str
    themes: list[str]
    feedback_quality: str


class SelectPolicyRequest(BaseModel):
    session_stage: str
    recent_context: list[ContextTurn]
    model_signals: ModelSignals


class SelectPolicyResponse(BaseModel):
    policy: str


# ---------------------------------------------------------------------------
# Text builders (mirror training pre-processing exactly)
# ---------------------------------------------------------------------------

def _flatten_context(turns: list[ContextTurn]) -> str:
    return "\n".join(f"{t.role.upper()}: {t.text}" for t in turns)


def _build_turn_text(req: AnalyzeTurnRequest) -> str:
    return (
        f"[INPUT_TYPE] {req.input_type}\n"
        f"[SOURCE_MODEL] {req.source_model_label}\n"
        f"[SESSION_STAGE] {req.session_stage}\n"
        f"[PROMPT] {req.original_prompt}\n"
        f"[GENERATED_CONTENT] {req.generated_content}\n"
        f"[RECENT_CONTEXT]\n{_flatten_context(req.recent_context)}\n"
        f"[LATEST_USER_MESSAGE] {req.latest_user_message}"
    )


def _build_policy_text(req: SelectPolicyRequest) -> str:
    signals = req.model_signals
    return (
        f"[SESSION_STAGE] {req.session_stage}\n"
        f"[RECENT_CONTEXT]\n{_flatten_context(req.recent_context)}\n"
        f"[SIGNALS] sentiment={signals.sentiment} topic={signals.topic} "
        f"continue={signals.continue_signal} feedback_quality={signals.feedback_quality} "
        f"themes={','.join(signals.themes)}"
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {"status": "ok", "device": device}


@app.post("/analyze-turn", response_model=AnalyzeTurnResponse)
def analyze_turn(req: AnalyzeTurnRequest):
    """
    Classify a single user turn in a feedback interview session.
    Returns sentiment, topic relevance, continue/stop signal, themes, and feedback quality.
    """
    try:
        model = get_feedback_model()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    text = _build_turn_text(req)
    result = model.predict(text)
    return AnalyzeTurnResponse(**result)


@app.post("/select-policy", response_model=SelectPolicyResponse)
def select_policy(req: SelectPolicyRequest):
    """
    Select the next interviewer action based on session state and model signals.
    Returns a single policy label such as probe_weakness or redirect_to_feedback.
    """
    try:
        model = get_policy_model()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    text = _build_policy_text(req)
    policy = model.predict(text)
    return SelectPolicyResponse(policy=policy)
