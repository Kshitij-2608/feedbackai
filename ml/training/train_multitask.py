import argparse
import json
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import accuracy_score, f1_score
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModel, AutoTokenizer

from label_maps import (
    CONTINUE_LABELS,
    QUALITY_LABELS,
    SENTIMENT_LABELS,
    SESSION_STAGE_LABELS,
    THEME_LABELS,
    TOPIC_LABELS,
    build_index,
)


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def flatten_context(context_rows):
    rendered = []
    for row in context_rows:
        rendered.append(f"{row['role'].upper()}: {row['text']}")
    return "\n".join(rendered)


def build_input_text(row):
    return (
        f"[INPUT_TYPE] {row['input_type']}\n"
        f"[SOURCE_MODEL] {row['source_model_label']}\n"
        f"[SESSION_STAGE] {row['session_stage']}\n"
        f"[PROMPT] {row['original_prompt']}\n"
        f"[GENERATED_CONTENT] {row['generated_content']}\n"
        f"[RECENT_CONTEXT]\n{flatten_context(row['recent_context'])}\n"
        f"[LATEST_USER_MESSAGE] {row['latest_user_message']}"
    )


class FeedbackDataset(Dataset):
    def __init__(self, rows, tokenizer, max_length):
        self.rows = rows
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.sentiment_index = build_index(SENTIMENT_LABELS)
        self.topic_index = build_index(TOPIC_LABELS)
        self.continue_index = build_index(CONTINUE_LABELS)
        self.quality_index = build_index(QUALITY_LABELS)
        self.stage_index = build_index(SESSION_STAGE_LABELS)
        self.theme_index = build_index(THEME_LABELS)

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        encoded = self.tokenizer(
            build_input_text(row),
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )

        labels = row["labels"]
        theme_vector = np.zeros(len(THEME_LABELS), dtype=np.float32)
        for theme in labels["themes"]:
            theme_vector[self.theme_index[theme]] = 1.0

        return {
            "input_ids": encoded["input_ids"].squeeze(0),
            "attention_mask": encoded["attention_mask"].squeeze(0),
            "sentiment": torch.tensor(self.sentiment_index[labels["sentiment"]], dtype=torch.long),
            "topic": torch.tensor(self.topic_index[labels["topic"]], dtype=torch.long),
            "continue_signal": torch.tensor(self.continue_index[labels["continue_signal"]], dtype=torch.long),
            "feedback_quality": torch.tensor(self.quality_index[labels["feedback_quality"]], dtype=torch.long),
            "session_stage": torch.tensor(self.stage_index[labels["session_stage"]], dtype=torch.long),
            "themes": torch.tensor(theme_vector, dtype=torch.float32),
        }


class MultiTaskFeedbackModel(nn.Module):
    def __init__(self, model_name):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size
        dropout_prob = getattr(self.encoder.config, "hidden_dropout_prob", 0.1)
        self.dropout = nn.Dropout(dropout_prob)
        self.sentiment_head = nn.Linear(hidden_size, len(SENTIMENT_LABELS))
        self.topic_head = nn.Linear(hidden_size, len(TOPIC_LABELS))
        self.continue_head = nn.Linear(hidden_size, len(CONTINUE_LABELS))
        self.quality_head = nn.Linear(hidden_size, len(QUALITY_LABELS))
        self.stage_head = nn.Linear(hidden_size, len(SESSION_STAGE_LABELS))
        self.theme_head = nn.Linear(hidden_size, len(THEME_LABELS))

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0]
        pooled = self.dropout(pooled)
        return {
            "sentiment": self.sentiment_head(pooled),
            "topic": self.topic_head(pooled),
            "continue_signal": self.continue_head(pooled),
            "feedback_quality": self.quality_head(pooled),
            "session_stage": self.stage_head(pooled),
            "themes": self.theme_head(pooled),
        }


def compute_loss(outputs, batch):
    ce = nn.CrossEntropyLoss()
    bce = nn.BCEWithLogitsLoss()

    loss = 0
    loss += ce(outputs["sentiment"], batch["sentiment"])
    loss += ce(outputs["topic"], batch["topic"])
    loss += ce(outputs["continue_signal"], batch["continue_signal"])
    loss += ce(outputs["feedback_quality"], batch["feedback_quality"])
    loss += ce(outputs["session_stage"], batch["session_stage"])
    loss += bce(outputs["themes"], batch["themes"])
    return loss


def evaluate(model, dataloader, device):
    model.eval()
    sentiment_preds = []
    sentiment_targets = []
    topic_preds = []
    topic_targets = []
    continue_preds = []
    continue_targets = []
    quality_preds = []
    quality_targets = []
    stage_preds = []
    stage_targets = []
    theme_preds = []
    theme_targets = []

    with torch.no_grad():
        for batch in dataloader:
            batch = {key: value.to(device) for key, value in batch.items()}
            outputs = model(batch["input_ids"], batch["attention_mask"])

            sentiment_preds.extend(outputs["sentiment"].argmax(dim=1).cpu().tolist())
            sentiment_targets.extend(batch["sentiment"].cpu().tolist())
            topic_preds.extend(outputs["topic"].argmax(dim=1).cpu().tolist())
            topic_targets.extend(batch["topic"].cpu().tolist())
            continue_preds.extend(outputs["continue_signal"].argmax(dim=1).cpu().tolist())
            continue_targets.extend(batch["continue_signal"].cpu().tolist())
            quality_preds.extend(outputs["feedback_quality"].argmax(dim=1).cpu().tolist())
            quality_targets.extend(batch["feedback_quality"].cpu().tolist())
            stage_preds.extend(outputs["session_stage"].argmax(dim=1).cpu().tolist())
            stage_targets.extend(batch["session_stage"].cpu().tolist())
            theme_preds.extend((torch.sigmoid(outputs["themes"]) > 0.5).int().cpu().numpy())
            theme_targets.extend(batch["themes"].int().cpu().numpy())

    return {
        "sentiment_accuracy": accuracy_score(sentiment_targets, sentiment_preds),
        "topic_accuracy": accuracy_score(topic_targets, topic_preds),
        "continue_accuracy": accuracy_score(continue_targets, continue_preds),
        "quality_accuracy": accuracy_score(quality_targets, quality_preds),
        "stage_accuracy": accuracy_score(stage_targets, stage_preds),
        "theme_micro_f1": f1_score(np.array(theme_targets), np.array(theme_preds), average="micro", zero_division=0),
    }


def main():
    parser = argparse.ArgumentParser(description="Train the FeedbackAI multi-task feedback model.")
    parser.add_argument("--train-file", required=True)
    parser.add_argument("--val-file", required=True)
    parser.add_argument("--model-name", default="distilroberta-base")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    train_rows = load_jsonl(args.train_file)
    val_rows = load_jsonl(args.val_file)

    train_dataset = FeedbackDataset(train_rows, tokenizer, args.max_length)
    val_dataset = FeedbackDataset(val_rows, tokenizer, args.max_length)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    model = MultiTaskFeedbackModel(args.model_name).to(device)
    optimizer = AdamW(model.parameters(), lr=args.learning_rate)

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        for batch in train_loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            outputs = model(batch["input_ids"], batch["attention_mask"])
            loss = compute_loss(outputs, batch)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        metrics = evaluate(model, val_loader, device)
        average_loss = running_loss / max(len(train_loader), 1)
        print(f"Epoch {epoch + 1}: train_loss={average_loss:.4f} metrics={metrics}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    model.encoder.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    torch.save(model.state_dict(), output_dir / "multitask_heads.pt")

    metadata = {
        "model_name": args.model_name,
        "sentiment_labels": SENTIMENT_LABELS,
        "topic_labels": TOPIC_LABELS,
        "continue_labels": CONTINUE_LABELS,
        "quality_labels": QUALITY_LABELS,
        "session_stage_labels": SESSION_STAGE_LABELS,
        "theme_labels": THEME_LABELS,
    }
    with open(output_dir / "label_metadata.json", "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    print(f"Saved model artifacts to {output_dir}")


if __name__ == "__main__":
    main()
