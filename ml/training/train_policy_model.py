import argparse
import json
from pathlib import Path

import torch
from sklearn.metrics import accuracy_score
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from label_maps import POLICY_LABELS, build_index


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def flatten_context(context_rows):
    return "\n".join(f"{row['role'].upper()}: {row['text']}" for row in context_rows)


def build_policy_text(row):
    signals = row["model_signals"]
    return (
        f"[SESSION_STAGE] {row['session_stage']}\n"
        f"[RECENT_CONTEXT]\n{flatten_context(row['recent_context'])}\n"
        f"[SIGNALS] sentiment={signals['sentiment']} topic={signals['topic']} continue={signals['continue_signal']} "
        f"feedback_quality={signals['feedback_quality']} themes={','.join(signals['themes'])}"
    )


class PolicyDataset(Dataset):
    def __init__(self, rows, tokenizer, max_length):
        self.rows = rows
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.policy_index = build_index(POLICY_LABELS)

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        encoded = self.tokenizer(
            build_policy_text(row),
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        return {
            "input_ids": encoded["input_ids"].squeeze(0),
            "attention_mask": encoded["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.policy_index[row["target_policy"]], dtype=torch.long),
        }


def evaluate(model, dataloader, device):
    model.eval()
    predictions = []
    targets = []
    with torch.no_grad():
        for batch in dataloader:
            batch = {key: value.to(device) for key, value in batch.items()}
            outputs = model(**batch)
            predictions.extend(outputs.logits.argmax(dim=1).cpu().tolist())
            targets.extend(batch["labels"].cpu().tolist())
    return accuracy_score(targets, predictions)


def main():
    parser = argparse.ArgumentParser(description="Train the FeedbackAI conversation policy model.")
    parser.add_argument("--train-file", required=True)
    parser.add_argument("--val-file", required=True)
    parser.add_argument("--model-name", default="distilroberta-base")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)

    train_rows = load_jsonl(args.train_file)
    val_rows = load_jsonl(args.val_file)

    train_dataset = PolicyDataset(train_rows, tokenizer, args.max_length)
    val_dataset = PolicyDataset(val_rows, tokenizer, args.max_length)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    model = AutoModelForSequenceClassification.from_pretrained(args.model_name, num_labels=len(POLICY_LABELS)).to(device)
    optimizer = AdamW(model.parameters(), lr=args.learning_rate)

    for epoch in range(args.epochs):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            batch = {key: value.to(device) for key, value in batch.items()}
            outputs = model(**batch)
            loss = outputs.loss
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        accuracy = evaluate(model, val_loader, device)
        avg_loss = total_loss / max(len(train_loader), 1)
        print(f"Epoch {epoch + 1}: train_loss={avg_loss:.4f} val_accuracy={accuracy:.4f}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    with open(output_dir / "policy_labels.json", "w", encoding="utf-8") as handle:
        json.dump(POLICY_LABELS, handle, indent=2)

    print(f"Saved policy model to {output_dir}")


if __name__ == "__main__":
    main()
