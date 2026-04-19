# ML Inference Server

This directory contains the runtime inference server for the trained FeedbackAI in-house models.

## Quick Start

From the `ml/` directory with the virtual environment activated:

```powershell
uvicorn serve.inference_server:app --host 0.0.0.0 --port 8001 --reload
```

The server will be available at `http://localhost:8001`.

## Endpoints

### GET /health

Returns server status and device (cpu or cuda).

```json
{ "status": "ok", "device": "cpu" }
```

### POST /analyze-turn

Classifies a single user turn in a feedback interview.

Request body:

```json
{
  "input_type": "text",
  "source_model_label": "GPT-4",
  "session_stage": "weaknesses",
  "original_prompt": "Summarize the risk report.",
  "generated_content": "The report looked fine.",
  "recent_context": [
    { "role": "assistant", "text": "What issue stood out most?" }
  ],
  "latest_user_message": "It completely missed the risk section."
}
```

Response:

```json
{
  "sentiment": "frustrated",
  "topic": "on_topic",
  "continue_signal": "continue",
  "feedback_quality": "highly_actionable",
  "session_stage": "weaknesses",
  "themes": ["completeness", "instruction_following"]
}
```

### POST /select-policy

Selects the next interviewer action given session state and model signals.

Request body:

```json
{
  "session_stage": "weaknesses",
  "recent_context": [
    { "role": "assistant", "text": "What was the main gap?" },
    { "role": "user", "text": "It invented facts that were not in the document." }
  ],
  "model_signals": {
    "sentiment": "frustrated",
    "topic": "on_topic",
    "continue_signal": "continue",
    "themes": ["hallucination", "accuracy"],
    "feedback_quality": "highly_actionable"
  }
}
```

Response:

```json
{ "policy": "probe_specific_issue" }
```

## Prerequisites

The trained model artifacts must exist at:

- `ml/artifacts/distilroberta-feedback-model/`
- `ml/artifacts/distilroberta-policy-model/`

Run `python training/train_all.py` from the `ml/` directory to produce them.
