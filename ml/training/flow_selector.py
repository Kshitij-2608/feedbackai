import json
from pathlib import Path


class FlowSelector:
    def __init__(self, jsonl_path):
        self.examples = self._load_examples(jsonl_path)

    def _load_examples(self, path):
        with open(path, "r", encoding="utf-8") as handle:
            return [json.loads(line) for line in handle if line.strip()]

    def select(self, category=None, context=None):
        context = context or {}
        candidates = self.examples

        if category:
            candidates = [item for item in candidates if item.get("category") == category]

        scored = []
        for example in candidates:
            score = 0
            example_context = example.get("context", {})
            for key, value in context.items():
                if example_context.get(key) == value:
                    score += 1
            scored.append((score, example))

        scored.sort(key=lambda item: item[0], reverse=True)
        return scored[0][1] if scored else None


if __name__ == "__main__":
    library_path = Path(__file__).resolve().parent.parent / "data" / "raw" / "greetings_and_flows.jsonl"
    selector = FlowSelector(library_path)
    sample = selector.select(category="redirect_polite", context={"topic": "off_topic", "session_stage": "weaknesses"})
    print(sample["response"] if sample else "No match found.")
