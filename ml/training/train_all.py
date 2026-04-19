"""
train_all.py — Convenience runner that builds all splits and trains both models sequentially.

Usage (from the ml/ directory with .venv activated):
    python training/train_all.py

The script expects the raw JSONL files to already exist in data/raw/.
It will create processed splits under data/processed/ and write model
artifacts to artifacts/.
"""

import subprocess
import sys
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent

DATA_RAW = ROOT_DIR / "data" / "raw"
DATA_PROCESSED = ROOT_DIR / "data" / "processed"
ARTIFACTS = ROOT_DIR / "artifacts"

FEEDBACK_RAW = DATA_RAW / "feedback_turn_classification.jsonl"
POLICY_RAW = DATA_RAW / "conversation_policy.jsonl"

FEEDBACK_PROCESSED = DATA_PROCESSED / "feedback_turns"
POLICY_PROCESSED = DATA_PROCESSED / "policy"

FEEDBACK_ARTIFACTS = ARTIFACTS / "distilroberta-feedback-model"
POLICY_ARTIFACTS = ARTIFACTS / "distilroberta-policy-model"

BASE_MODEL = "distilroberta-base"


def run(description, args):
    print(f"\n{'=' * 60}")
    print(f"  {description}")
    print(f"{'=' * 60}")
    start = time.time()
    result = subprocess.run(
        [sys.executable] + [str(a) for a in args],
        cwd=str(SCRIPT_DIR),
    )
    elapsed = time.time() - start
    if result.returncode != 0:
        print(f"\n[ERROR] Step failed: {description}")
        sys.exit(result.returncode)
    print(f"\n[OK] {description} completed in {elapsed:.1f}s")


def main():
    print("\nFeedbackAI — Full ML Training Pipeline")
    print("=" * 60)

    # Step 1: Build feedback classification splits
    run(
        "Building feedback turn classification splits",
        [
            "build_splits.py",
            "--source", FEEDBACK_RAW,
            "--output-dir", FEEDBACK_PROCESSED,
        ],
    )

    # Step 2: Build policy model splits
    run(
        "Building conversation policy splits",
        [
            "build_splits.py",
            "--source", POLICY_RAW,
            "--output-dir", POLICY_PROCESSED,
        ],
    )

    # Step 3: Train multi-task feedback model
    run(
        "Training multi-task feedback classifier",
        [
            "train_multitask.py",
            "--train-file", FEEDBACK_PROCESSED / "train.jsonl",
            "--val-file", FEEDBACK_PROCESSED / "val.jsonl",
            "--model-name", BASE_MODEL,
            "--output-dir", FEEDBACK_ARTIFACTS,
            "--epochs", "5",
            "--batch-size", "8",
            "--max-length", "512",
        ],
    )

    # Step 4: Train policy model
    run(
        "Training conversation policy model",
        [
            "train_policy_model.py",
            "--train-file", POLICY_PROCESSED / "train.jsonl",
            "--val-file", POLICY_PROCESSED / "val.jsonl",
            "--model-name", BASE_MODEL,
            "--output-dir", POLICY_ARTIFACTS,
            "--epochs", "8",
            "--batch-size", "8",
            "--max-length", "256",
        ],
    )

    print("\n" + "=" * 60)
    print("  All steps completed successfully.")
    print(f"  Feedback model  → {FEEDBACK_ARTIFACTS}")
    print(f"  Policy model    → {POLICY_ARTIFACTS}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
