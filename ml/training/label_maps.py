SENTIMENT_LABELS = ["positive", "neutral", "hesitant", "frustrated", "wants_to_stop"]
TOPIC_LABELS = ["on_topic", "off_topic"]
CONTINUE_LABELS = ["continue", "uncertain", "stop"]
QUALITY_LABELS = ["vague", "somewhat_actionable", "highly_actionable"]
SESSION_STAGE_LABELS = ["opening", "first_impression", "strengths", "weaknesses", "improvement_request", "wrap_up"]
POLICY_LABELS = [
    "greet_opening",
    "ask_first_impression",
    "probe_strength",
    "probe_weakness",
    "probe_specific_issue",
    "ask_improvement_priority",
    "redirect_to_feedback",
    "shorten_question",
    "empathy_then_probe",
    "confirm_end",
    "wrap_up",
]
THEME_LABELS = [
    "accuracy",
    "completeness",
    "relevance",
    "clarity",
    "tone",
    "formatting",
    "hallucination",
    "latency",
    "usability",
    "reasoning",
    "instruction_following",
    "safety",
    "other",
]


def build_index(labels):
    return {label: index for index, label in enumerate(labels)}
