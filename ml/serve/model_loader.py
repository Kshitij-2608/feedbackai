"""
model_loader.py — Loads trained FeedbackAI model artifacts at startup.

Both the multi-task feedback model and the policy model are loaded once
and kept in memory for the lifetime of the inference server process.
"""

import json
import sys
from pathlib import Path

# Make training/ importable (label_maps, train_multitask live there)
TRAINING_DIR = Path(__file__).parent.parent / "training"
if str(TRAINING_DIR) not in sys.path:
    sys.path.insert(0, str(TRAINING_DIR))

import torch
from transformers import AutoModel, AutoModelForSequenceClassification, AutoTokenizer

from label_maps import (
    CONTINUE_LABELS,
    POLICY_LABELS,
    QUALITY_LABELS,
    SENTIMENT_LABELS,
    SESSION_STAGE_LABELS,
    THEME_LABELS,
    build_index,
)
from train_multitask import MultiTaskFeedbackModel

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
FEEDBACK_MODEL_DIR = ARTIFACTS_DIR / "distilroberta-feedback-model"
POLICY_MODEL_DIR = ARTIFACTS_DIR / "distilroberta-policy-model"


class FeedbackModelWrapper:
    """
    Wraps the trained multi-task feedback model with label index maps
    and exposes a single predict() method.
    """

    def __init__(self, model_dir: Path, device: torch.device):
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
        self.model = MultiTaskFeedbackModel(str(model_dir))
        state = torch.load(
            model_dir / "multitask_heads.pt",
            map_location=device,
            weights_only=True,
        )
        self.model.load_state_dict(state)
        self.model.to(device)
        self.model.eval()

        meta_path = model_dir / "label_metadata.json"
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

        self.sentiment_labels = meta["sentiment_labels"]
        self.topic_labels = meta["topic_labels"]
        self.continue_labels = meta["continue_labels"]
        self.quality_labels = meta["quality_labels"]
        self.stage_labels = meta["session_stage_labels"]
        self.theme_labels = meta["theme_labels"]

    def predict(self, text: str) -> dict:
        encoded = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding="max_length",
        )
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)

        with torch.no_grad():
            outputs = self.model(input_ids, attention_mask)

        sentiment = self.sentiment_labels[outputs["sentiment"].argmax(dim=1).item()]
        topic = self.topic_labels[outputs["topic"].argmax(dim=1).item()]
        continue_signal = self.continue_labels[outputs["continue_signal"].argmax(dim=1).item()]
        feedback_quality = self.quality_labels[outputs["feedback_quality"].argmax(dim=1).item()]
        session_stage = self.stage_labels[outputs["session_stage"].argmax(dim=1).item()]

        theme_probs = torch.sigmoid(outputs["themes"]).squeeze(0)
        themes = [
            label
            for label, prob in zip(self.theme_labels, theme_probs.tolist())
            if prob > 0.5
        ]
        if not themes:
            themes = ["other"]

        return {
            "sentiment": sentiment,
            "topic": topic,
            "continue_signal": continue_signal,
            "feedback_quality": feedback_quality,
            "session_stage": session_stage,
            "themes": themes,
        }


class PolicyModelWrapper:
    """
    Wraps the trained conversation policy model.
    """

    def __init__(self, model_dir: Path, device: torch.device):
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
        self.model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
        self.model.to(device)
        self.model.eval()

        policy_path = model_dir / "policy_labels.json"
        with open(policy_path, encoding="utf-8") as f:
            self.policy_labels = json.load(f)

    def predict(self, text: str) -> str:
        encoded = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256,
            padding="max_length",
        )
        input_ids = encoded["input_ids"].to(self.device)
        attention_mask = encoded["attention_mask"].to(self.device)

        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)

        return self.policy_labels[outputs.logits.argmax(dim=1).item()]


_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_feedback_model: FeedbackModelWrapper | None = None
_policy_model: PolicyModelWrapper | None = None


def get_feedback_model() -> FeedbackModelWrapper:
    global _feedback_model
    if _feedback_model is None:
        if not FEEDBACK_MODEL_DIR.exists():
            raise RuntimeError(
                f"Feedback model artifacts not found at {FEEDBACK_MODEL_DIR}. "
                "Run training/train_all.py first."
            )
        _feedback_model = FeedbackModelWrapper(FEEDBACK_MODEL_DIR, _device)
    return _feedback_model


def get_policy_model() -> PolicyModelWrapper:
    global _policy_model
    if _policy_model is None:
        if not POLICY_MODEL_DIR.exists():
            raise RuntimeError(
                f"Policy model artifacts not found at {POLICY_MODEL_DIR}. "
                "Run training/train_all.py first."
            )
        _policy_model = PolicyModelWrapper(POLICY_MODEL_DIR, _device)
    return _policy_model
