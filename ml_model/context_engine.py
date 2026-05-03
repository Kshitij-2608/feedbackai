import numpy as np
from typing import List, Dict, Tuple, Optional
import re
import hashlib


class AttentionLayer:
    def __init__(self, d_model: int = 128, n_heads: int = 4):
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        np.random.seed(42)
        self.W_q = np.random.randn(d_model, d_model) * 0.02
        self.W_k = np.random.randn(d_model, d_model) * 0.02
        self.W_v = np.random.randn(d_model, d_model) * 0.02
        self.W_o = np.random.randn(d_model, d_model) * 0.02

    def scaled_dot_product_attention(self, Q, K, V):
        d_k = Q.shape[-1]
        scores = np.matmul(Q, K.transpose(-1, -2)) / np.sqrt(d_k)
        attention_weights = self._softmax(scores)
        return np.matmul(attention_weights, V), attention_weights

    def _softmax(self, x):
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / e_x.sum(axis=-1, keepdims=True)

    def forward(self, x):
        batch_size = x.shape[0]
        Q = np.matmul(x, self.W_q)
        K = np.matmul(x, self.W_k)
        V = np.matmul(x, self.W_v)
        Q = Q.reshape(batch_size, -1, self.n_heads, self.d_k).transpose(0, 2, 1, 3)
        K = K.reshape(batch_size, -1, self.n_heads, self.d_k).transpose(0, 2, 1, 3)
        V = V.reshape(batch_size, -1, self.n_heads, self.d_k).transpose(0, 2, 1, 3)
        attn_output, weights = self.scaled_dot_product_attention(Q, K, V)
        attn_output = attn_output.transpose(0, 2, 1, 3).reshape(batch_size, -1, self.d_model)
        return np.matmul(attn_output, self.W_o), weights


class FeedForwardNetwork:
    def __init__(self, d_model: int = 128, d_ff: int = 512):
        np.random.seed(43)
        self.W1 = np.random.randn(d_model, d_ff) * 0.02
        self.b1 = np.zeros(d_ff)
        self.W2 = np.random.randn(d_ff, d_model) * 0.02
        self.b2 = np.zeros(d_model)

    def gelu(self, x):
        return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x**3)))

    def forward(self, x):
        hidden = self.gelu(np.matmul(x, self.W1) + self.b1)
        return np.matmul(hidden, self.W2) + self.b2


class TransformerBlock:
    def __init__(self, d_model: int = 128, n_heads: int = 4, d_ff: int = 512):
        self.attention = AttentionLayer(d_model, n_heads)
        self.ffn = FeedForwardNetwork(d_model, d_ff)
        self.gamma1 = np.ones(d_model)
        self.beta1 = np.zeros(d_model)
        self.gamma2 = np.ones(d_model)
        self.beta2 = np.zeros(d_model)

    def layer_norm(self, x, gamma, beta, eps=1e-6):
        mean = np.mean(x, axis=-1, keepdims=True)
        std = np.std(x, axis=-1, keepdims=True)
        return gamma * (x - mean) / (std + eps) + beta

    def forward(self, x):
        attn_out, weights = self.attention.forward(x)
        x = self.layer_norm(x + attn_out, self.gamma1, self.beta1)
        ffn_out = self.ffn.forward(x)
        x = self.layer_norm(x + ffn_out, self.gamma2, self.beta2)
        return x, weights


class TokenEmbedding:
    def __init__(self, vocab_size: int = 10000, d_model: int = 128, max_seq_len: int = 512):
        self.d_model = d_model
        self.vocab_size = vocab_size
        np.random.seed(44)
        self.token_embeddings = np.random.randn(vocab_size, d_model) * 0.02
        self.position_embeddings = self._sinusoidal_encoding(max_seq_len, d_model)

    def _sinusoidal_encoding(self, max_len, d_model):
        pe = np.zeros((max_len, d_model))
        position = np.arange(0, max_len)[:, np.newaxis]
        div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
        pe[:, 0::2] = np.sin(position * div_term)
        pe[:, 1::2] = np.cos(position * div_term)
        return pe

    def _hash_token(self, token: str) -> int:
        return int(hashlib.md5(token.encode()).hexdigest(), 16) % self.vocab_size

    def embed(self, tokens: List[str]) -> np.ndarray:
        seq_len = len(tokens)
        token_ids = [self._hash_token(t) for t in tokens]
        embedded = self.token_embeddings[token_ids]
        embedded += self.position_embeddings[:seq_len]
        return embedded * np.sqrt(self.d_model)


class ContextUnderstandingEngine:
    def __init__(self, d_model: int = 128, n_layers: int = 3, n_heads: int = 4):
        self.d_model = d_model
        self.n_layers = n_layers
        self.embedding = TokenEmbedding(d_model=d_model)
        self.transformer_blocks = [
            TransformerBlock(d_model, n_heads) for _ in range(n_layers)
        ]
        np.random.seed(45)
        self.context_projection = np.random.randn(d_model, 64) * 0.02
        self.topic_classifier = np.random.randn(64, 12) * 0.02
        self._topic_labels = [
            "quality_feedback", "usability_concern", "feature_request",
            "performance_issue", "positive_experience", "negative_experience",
            "comparison", "suggestion", "question", "confusion",
            "satisfaction", "frustration"
        ]
        self._warmup_complete = False

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        return tokens[:512]

    def _extract_ngrams(self, tokens: List[str], n: int = 3) -> List[str]:
        ngrams = []
        for i in range(len(tokens) - n + 1):
            ngrams.append("_".join(tokens[i:i+n]))
        return ngrams

    def encode(self, text: str) -> np.ndarray:
        tokens = self._tokenize(text)
        if not tokens:
            return np.zeros((1, self.d_model))
        embedded = self.embedding.embed(tokens)
        x = embedded[np.newaxis, :, :]
        attention_maps = []
        for block in self.transformer_blocks:
            x, attn_weights = block.forward(x)
            attention_maps.append(attn_weights)
        return x

    def extract_context_vector(self, text: str) -> np.ndarray:
        encoded = self.encode(text)
        context = np.mean(encoded, axis=1)
        return context.squeeze()

    def classify_topic(self, text: str) -> Dict[str, float]:
        context = self.extract_context_vector(text)
        projected = np.matmul(context, self.context_projection)
        logits = np.matmul(projected, self.topic_classifier)
        exp_logits = np.exp(logits - np.max(logits))
        probs = exp_logits / exp_logits.sum()
        result = {label: float(prob) for label, prob in zip(self._topic_labels, probs)}
        return dict(sorted(result.items(), key=lambda x: x[1], reverse=True))

    def compute_conversation_context(self, messages: List[Dict]) -> Dict:
        if not messages:
            return {"context_vector": np.zeros(self.d_model), "topics": {}, "coherence": 0.0}
        context_vectors = []
        for msg in messages:
            vec = self.extract_context_vector(msg.get("content", msg.get("message", "")))
            context_vectors.append(vec)
        stacked = np.stack(context_vectors)
        weights = np.exp(np.arange(len(context_vectors)) * 0.1)
        weights /= weights.sum()
        weighted_context = np.average(stacked, axis=0, weights=weights)
        coherence_scores = []
        for i in range(1, len(context_vectors)):
            cos_sim = np.dot(context_vectors[i], context_vectors[i-1]) / (
                np.linalg.norm(context_vectors[i]) * np.linalg.norm(context_vectors[i-1]) + 1e-8
            )
            coherence_scores.append(cos_sim)
        avg_coherence = float(np.mean(coherence_scores)) if coherence_scores else 0.0
        combined_text = " ".join(m.get("content", m.get("message", "")) for m in messages)
        topics = self.classify_topic(combined_text)
        return {
            "context_vector": weighted_context,
            "topics": topics,
            "coherence_score": avg_coherence,
            "num_turns": len(messages),
            "dominant_topic": max(topics, key=topics.get),
        }

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        vec_a = self.extract_context_vector(text_a)
        vec_b = self.extract_context_vector(text_b)
        cos_sim = np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b) + 1e-8)
        return float(cos_sim)

    def warmup(self):
        _ = self.encode("warmup sequence for model initialization")
        self._warmup_complete = True
        return True
