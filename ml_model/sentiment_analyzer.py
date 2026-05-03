import numpy as np
from typing import List, Dict, Tuple, Optional
import re


class BiLSTMCell:
    def __init__(self, input_size: int, hidden_size: int):
        self.hidden_size = hidden_size
        np.random.seed(46)
        scale = 0.1
        self.W_f = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.b_f = np.ones(hidden_size)
        self.W_i = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.b_i = np.zeros(hidden_size)
        self.W_c = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.b_c = np.zeros(hidden_size)
        self.W_o = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.b_o = np.zeros(hidden_size)

    def _sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

    def forward_step(self, x_t, h_prev, c_prev):
        combined = np.concatenate([x_t, h_prev], axis=-1)
        f_t = self._sigmoid(np.matmul(combined, self.W_f) + self.b_f)
        i_t = self._sigmoid(np.matmul(combined, self.W_i) + self.b_i)
        c_tilde = np.tanh(np.matmul(combined, self.W_c) + self.b_c)
        c_t = f_t * c_prev + i_t * c_tilde
        o_t = self._sigmoid(np.matmul(combined, self.W_o) + self.b_o)
        h_t = o_t * np.tanh(c_t)
        return h_t, c_t


class SentimentAttentionHead:
    def __init__(self, hidden_size: int):
        np.random.seed(47)
        self.W_attn = np.random.randn(hidden_size, hidden_size) * 0.02
        self.v_attn = np.random.randn(hidden_size) * 0.02

    def forward(self, hidden_states):
        scores = np.tanh(np.matmul(hidden_states, self.W_attn))
        attention_weights = np.matmul(scores, self.v_attn)
        attention_weights = np.exp(attention_weights - np.max(attention_weights))
        attention_weights /= attention_weights.sum() + 1e-8
        context = np.sum(hidden_states * attention_weights[:, np.newaxis], axis=0)
        return context, attention_weights


class AspectExtractor:
    def __init__(self, hidden_size: int, num_aspects: int = 8):
        np.random.seed(48)
        self.W_aspect = np.random.randn(hidden_size, num_aspects) * 0.02
        self.aspect_labels = [
            "accuracy", "speed", "quality", "usability",
            "reliability", "clarity", "completeness", "relevance"
        ]

    def extract(self, context_vector):
        logits = np.matmul(context_vector, self.W_aspect)
        scores = 1 / (1 + np.exp(-logits))
        return {label: float(score) for label, score in zip(self.aspect_labels, scores)}


class EmotionDetector:
    def __init__(self, hidden_size: int):
        np.random.seed(49)
        self.emotion_labels = [
            "joy", "trust", "anticipation", "surprise",
            "sadness", "disgust", "anger", "fear"
        ]
        self.W_emotion = np.random.randn(hidden_size, len(self.emotion_labels)) * 0.02

    def detect(self, context_vector):
        logits = np.matmul(context_vector, self.W_emotion)
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        return {label: float(prob) for label, prob in zip(self.emotion_labels, probs)}


class SentimentAnalyzer:
    def __init__(self, embedding_dim: int = 128, hidden_size: int = 64):
        self.embedding_dim = embedding_dim
        self.hidden_size = hidden_size
        self.forward_lstm = BiLSTMCell(embedding_dim, hidden_size)
        self.backward_lstm = BiLSTMCell(embedding_dim, hidden_size)
        self.attention = SentimentAttentionHead(hidden_size * 2)
        self.aspect_extractor = AspectExtractor(hidden_size * 2)
        self.emotion_detector = EmotionDetector(hidden_size * 2)
        np.random.seed(50)
        self.W_sentiment = np.random.randn(hidden_size * 2, 5) * 0.02
        self.sentiment_labels = [
            "Very Negative", "Negative", "Neutral", "Positive", "Very Positive"
        ]
        np.random.seed(51)
        self.char_embeddings = np.random.randn(256, embedding_dim) * 0.02
        self._lexicon = self._build_sentiment_lexicon()

    def _build_sentiment_lexicon(self):
        positive = {
            "good", "great", "excellent", "amazing", "wonderful", "fantastic",
            "love", "like", "best", "perfect", "happy", "satisfied", "impressive",
            "beautiful", "helpful", "easy", "fast", "reliable", "accurate", "clear",
            "awesome", "superb", "outstanding", "brilliant"
        }
        negative = {
            "bad", "terrible", "awful", "horrible", "worst", "hate", "dislike",
            "poor", "slow", "ugly", "difficult", "confusing", "broken", "useless",
            "frustrating", "disappointing", "annoying", "inaccurate", "unreliable",
            "fail", "error", "bug", "crash", "lag"
        }
        intensifiers = {
            "very", "really", "extremely", "absolutely", "completely", "totally",
            "incredibly", "highly", "super", "quite"
        }
        negators = {"not", "no", "never", "neither", "nor", "hardly", "barely", "dont", "doesnt"}
        return {"positive": positive, "negative": negative, "intensifiers": intensifiers, "negators": negators}

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower().strip()
        text = re.sub(r'[^\w\s\']', ' ', text)
        return text.split()

    def _embed_tokens(self, tokens: List[str]) -> np.ndarray:
        embeddings = []
        for token in tokens:
            char_ids = [ord(c) % 256 for c in token[:20]]
            char_vecs = self.char_embeddings[char_ids]
            token_emb = np.mean(char_vecs, axis=0)
            embeddings.append(token_emb)
        return np.stack(embeddings)

    def _bilstm_encode(self, embeddings: np.ndarray) -> np.ndarray:
        seq_len = embeddings.shape[0]
        forward_states = []
        h_f = np.zeros(self.hidden_size)
        c_f = np.zeros(self.hidden_size)
        for t in range(seq_len):
            h_f, c_f = self.forward_lstm.forward_step(embeddings[t], h_f, c_f)
            forward_states.append(h_f)
        backward_states = []
        h_b = np.zeros(self.hidden_size)
        c_b = np.zeros(self.hidden_size)
        for t in range(seq_len - 1, -1, -1):
            h_b, c_b = self.backward_lstm.forward_step(embeddings[t], h_b, c_b)
            backward_states.insert(0, h_b)
        combined = np.concatenate([np.stack(forward_states), np.stack(backward_states)], axis=-1)
        return combined

    def _lexicon_features(self, tokens: List[str]) -> Dict:
        pos_count = 0
        neg_count = 0
        intensified = False
        negated = False
        for i, token in enumerate(tokens):
            if token in self._lexicon["negators"]:
                negated = True
                continue
            if token in self._lexicon["intensifiers"]:
                intensified = True
                continue
            if token in self._lexicon["positive"]:
                if negated:
                    neg_count += 2 if intensified else 1
                else:
                    pos_count += 2 if intensified else 1
            elif token in self._lexicon["negative"]:
                if negated:
                    pos_count += 1
                else:
                    neg_count += 2 if intensified else 1
            intensified = False
            negated = False
        total = pos_count + neg_count + 1
        return {
            "positive_ratio": pos_count / total,
            "negative_ratio": neg_count / total,
            "lexicon_polarity": (pos_count - neg_count) / total,
        }

    def analyze(self, text: str) -> Dict:
        tokens = self._tokenize(text)
        if not tokens:
            return {
                "sentiment": "Neutral",
                "confidence": 0.5,
                "polarity_score": 0.0,
                "aspects": {},
                "emotions": {},
            }
        embeddings = self._embed_tokens(tokens)
        hidden_states = self._bilstm_encode(embeddings)
        context_vector, attention_weights = self.attention.forward(hidden_states)
        logits = np.matmul(context_vector, self.W_sentiment)
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        lexicon = self._lexicon_features(tokens)
        neural_polarity = float(np.sum(probs[3:]) - np.sum(probs[:2]))
        combined_polarity = 0.6 * neural_polarity + 0.4 * lexicon["lexicon_polarity"]
        if combined_polarity > 0.3:
            sentiment_idx = 4 if combined_polarity > 0.6 else 3
        elif combined_polarity < -0.3:
            sentiment_idx = 0 if combined_polarity < -0.6 else 1
        else:
            sentiment_idx = 2
        aspects = self.aspect_extractor.extract(context_vector)
        emotions = self.emotion_detector.detect(context_vector)
        return {
            "sentiment": self.sentiment_labels[sentiment_idx],
            "confidence": float(max(probs)),
            "polarity_score": round(combined_polarity, 4),
            "distribution": {label: float(p) for label, p in zip(self.sentiment_labels, probs)},
            "aspects": aspects,
            "emotions": emotions,
            "lexicon_features": lexicon,
            "attention_weights": attention_weights.tolist(),
        }

    def analyze_conversation(self, messages: List[Dict]) -> Dict:
        if not messages:
            return {"overall_sentiment": "Neutral", "trajectory": [], "shift_points": []}
        trajectory = []
        for msg in messages:
            text = msg.get("content", msg.get("message", ""))
            role = msg.get("role", "user")
            if role.lower() in ("user", "human"):
                result = self.analyze(text)
                trajectory.append({
                    "turn": len(trajectory),
                    "sentiment": result["sentiment"],
                    "polarity": result["polarity_score"],
                })
        if not trajectory:
            return {"overall_sentiment": "Neutral", "trajectory": [], "shift_points": []}
        avg_polarity = np.mean([t["polarity"] for t in trajectory])
        if avg_polarity > 0.3:
            overall = "Positive"
        elif avg_polarity < -0.3:
            overall = "Negative"
        else:
            overall = "Neutral"
        shift_points = []
        for i in range(1, len(trajectory)):
            delta = abs(trajectory[i]["polarity"] - trajectory[i-1]["polarity"])
            if delta > 0.4:
                shift_points.append({
                    "turn": i,
                    "from": trajectory[i-1]["sentiment"],
                    "to": trajectory[i]["sentiment"],
                    "magnitude": round(delta, 3),
                })
        return {
            "overall_sentiment": overall,
            "average_polarity": round(float(avg_polarity), 4),
            "trajectory": trajectory,
            "shift_points": shift_points,
            "turn_count": len(trajectory),
        }
