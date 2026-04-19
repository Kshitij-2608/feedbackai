# FeedbackAI ML Workspace

This folder contains the in-house model design assets for the FeedbackAI interview system:

- dataset schemas and label definitions
- annotation guidelines
- starter JSONL datasets
- a multi-task training pipeline scaffold

## Model Goal

The in-house model is designed to handle the decision and analysis layer of the interview process, not the full free-form conversation generation layer.

Primary responsibilities:

- classify user sentiment
- detect off-topic drift
- predict continue or stop intent
- tag feedback themes
- score feedback usefulness
- recommend the next conversation policy action

## Recommended Architecture

- backbone: encoder-only transformer such as `microsoft/deberta-v3-small`, `distilroberta-base`, or `bert-base-uncased`
- heads:
  - sentiment
  - topic
  - continue signal
  - feedback quality
  - session stage
  - conversation policy
  - theme multi-label head

## Folder Layout

```text
ml/
  data/
    raw/
    processed/
  schema/
  training/
  requirements.txt
```

## Quick Start

Create a Python virtual environment and install the ML dependencies:

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Build train, validation, and test splits:

```bash
python training/build_splits.py --source data/raw/feedback_turn_classification.jsonl --output-dir data/processed
```

Train the multi-task model:

```bash
python training/train_multitask.py ^
  --train-file data/processed/train.jsonl ^
  --val-file data/processed/val.jsonl ^
  --model-name distilroberta-base ^
  --output-dir artifacts\distilroberta-feedback-model
```

## Datasets Included

- `data/raw/feedback_turn_classification.jsonl`
  - turn-level supervision for the main classifier
- `data/raw/conversation_policy.jsonl`
  - next-step conversational policy decisions
- `data/raw/greetings_and_flows.jsonl`
  - style and flow patterns for greetings, redirects, transitions, and wrap-ups

## Notes

- The included datasets are a strong starter set, not a full production corpus.
- You should expand the data with reviewed synthetic examples first, then add anonymized real sessions later.
- The live backend can consume predictions from this model before you replace any external LLM-based reply generation.
