import argparse
import json
import random
from pathlib import Path


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Build train, validation, and test splits from a JSONL file.")
    parser.add_argument("--source", required=True, help="Path to the source JSONL file.")
    parser.add_argument("--output-dir", required=True, help="Directory where split files will be written.")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    args = parser.parse_args()

    rows = load_jsonl(args.source)
    rng = random.Random(args.seed)
    rng.shuffle(rows)

    total = len(rows)
    train_end = int(total * args.train_ratio)
    val_end = train_end + int(total * args.val_ratio)

    train_rows = rows[:train_end]
    val_rows = rows[train_end:val_end]
    test_rows = rows[val_end:]

    output_dir = Path(args.output_dir)
    write_jsonl(output_dir / "train.jsonl", train_rows)
    write_jsonl(output_dir / "val.jsonl", val_rows)
    write_jsonl(output_dir / "test.jsonl", test_rows)

    print(f"Wrote {len(train_rows)} train, {len(val_rows)} val, and {len(test_rows)} test examples to {output_dir}.")


if __name__ == "__main__":
    main()
