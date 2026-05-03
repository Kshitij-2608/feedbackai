import numpy as np
from typing import List, Dict, Optional
from .context_engine import ContextUnderstandingEngine
from .sentiment_analyzer import SentimentAnalyzer


class ResponseQualityScorer:
    def __init__(self, d_model: int = 128):
        np.random.seed(52)
        self.W_quality = np.random.randn(d_model, 6) * 0.02
        self.quality_dimensions = [
            "relevance", "coherence", "informativeness",
            "specificity", "empathy", "actionability"
        ]

    def score(self, context_vector: np.ndarray) -> Dict[str, float]:
        logits = np.matmul(context_vector, self.W_quality)
        scores = 1 / (1 + np.exp(-logits))
        return {dim: round(float(s), 4) for dim, s in zip(self.quality_dimensions, scores)}


class ConversationFlowAnalyzer:
    def __init__(self):
        self.flow_states = [
            "greeting", "context_setting", "probing",
            "deep_dive", "clarification", "wrapping_up", "farewell"
        ]

    def detect_flow_state(self, turn_index: int, total_turns: int, topic_distribution: Dict) -> str:
        progress = turn_index / max(total_turns, 1)
        if progress < 0.1:
            return "greeting"
        elif progress < 0.25:
            return "context_setting"
        elif progress < 0.5:
            return "probing"
        elif progress < 0.75:
            return "deep_dive"
        elif progress < 0.9:
            return "clarification"
        else:
            return "wrapping_up"


class HeuriSensePipeline:
    def __init__(self, config: Optional[Dict] = None):
        config = config or {}
        d_model = config.get("d_model", 128)
        n_layers = config.get("n_layers", 3)
        n_heads = config.get("n_heads", 4)
        self.context_engine = ContextUnderstandingEngine(d_model, n_layers, n_heads)
        self.sentiment_analyzer = SentimentAnalyzer(embedding_dim=d_model)
        self.quality_scorer = ResponseQualityScorer(d_model)
        self.flow_analyzer = ConversationFlowAnalyzer()
        self._initialized = False

    def initialize(self):
        self.context_engine.warmup()
        _ = self.sentiment_analyzer.analyze("initialization warmup text")
        self._initialized = True
        return {"status": "ready", "components": ["context_engine", "sentiment_analyzer", "quality_scorer", "flow_analyzer"]}

    def process_user_input(self, text: str, conversation_history: List[Dict] = None) -> Dict:
        if not self._initialized:
            self.initialize()
        context_result = self.context_engine.compute_conversation_context(
            conversation_history or []
        )
        context_vector = self.context_engine.extract_context_vector(text)
        topic_distribution = self.context_engine.classify_topic(text)
        sentiment_result = self.sentiment_analyzer.analyze(text)
        quality_scores = self.quality_scorer.score(context_vector)
        turn_index = len(conversation_history) if conversation_history else 0
        total_turns = turn_index + 5
        flow_state = self.flow_analyzer.detect_flow_state(
            turn_index, total_turns, topic_distribution
        )
        enriched_context = {
            "original_text": text,
            "context_vector": context_vector.tolist(),
            "topic_distribution": topic_distribution,
            "dominant_topic": max(topic_distribution, key=topic_distribution.get),
            "sentiment": {
                "label": sentiment_result["sentiment"],
                "polarity": sentiment_result["polarity_score"],
                "confidence": sentiment_result["confidence"],
                "emotions": sentiment_result.get("emotions", {}),
            },
            "quality_scores": quality_scores,
            "flow_state": flow_state,
            "coherence_score": context_result.get("coherence_score", 0.0),
            "turn_index": turn_index,
        }
        return enriched_context

    def generate_session_analytics(self, conversation_history: List[Dict]) -> Dict:
        if not self._initialized:
            self.initialize()
        context_result = self.context_engine.compute_conversation_context(conversation_history)
        sentiment_trajectory = self.sentiment_analyzer.analyze_conversation(conversation_history)
        user_messages = [m for m in conversation_history if m.get("role", "").lower() in ("user", "human")]
        ai_messages = [m for m in conversation_history if m.get("role", "").lower() in ("ai", "assistant")]
        user_vectors = []
        for msg in user_messages:
            vec = self.context_engine.extract_context_vector(msg.get("content", msg.get("message", "")))
            user_vectors.append(vec)
        topic_evolution = []
        for i, msg in enumerate(user_messages):
            text = msg.get("content", msg.get("message", ""))
            topics = self.context_engine.classify_topic(text)
            topic_evolution.append({
                "turn": i,
                "dominant_topic": max(topics, key=topics.get),
                "confidence": max(topics.values()),
            })
        engagement_scores = []
        for i, msg in enumerate(user_messages):
            text = msg.get("content", msg.get("message", ""))
            word_count = len(text.split())
            detail_score = min(word_count / 20.0, 1.0)
            engagement_scores.append(round(detail_score, 3))
        strengths = []
        weaknesses = []
        avg_quality = self.quality_scorer.score(context_result["context_vector"])
        for dim, score in avg_quality.items():
            if score > 0.6:
                strengths.append(f"Strong {dim} in responses")
            elif score < 0.4:
                weaknesses.append(f"{dim.capitalize()} could be improved")
        return {
            "session_context": {
                "dominant_topic": context_result.get("dominant_topic", "unknown"),
                "coherence_score": round(context_result.get("coherence_score", 0.0), 4),
                "total_turns": context_result.get("num_turns", 0),
            },
            "sentiment_analysis": sentiment_trajectory,
            "topic_evolution": topic_evolution,
            "engagement_curve": engagement_scores,
            "quality_assessment": avg_quality,
            "model_strengths": strengths,
            "model_weaknesses": weaknesses,
            "user_engagement_score": round(float(np.mean(engagement_scores)) if engagement_scores else 0.0, 4),
        }
