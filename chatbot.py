from typing import Dict, List, Optional
import datetime
import threading
from llm import generate_heurisense_response, generate_session_summary
import db


class ConversationLog:
    def __init__(self, role: str, message: str):
        self.role = role
        self.message = message
        self.created_at = datetime.datetime.now()


class FeedbackSession:
    def __init__(self, session_id: str, user_id: Optional[int] = None, content_type: str = "image"):
        self.session_id = session_id
        self.user_id = user_id
        self.state = "ACTIVE"
        self.content_type = content_type
        self.overall_rating = None
        self.summary_json = None
        self.logs: List[ConversationLog] = []
        self._init_in_db()

    def _init_in_db(self):
        try:
            conn = db.get_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO sessions (session_id, user_id, state, content_type)
                       VALUES (%s, %s, 'ACTIVE', %s)
                       ON CONFLICT (session_id) DO NOTHING""",
                    (self.session_id, self.user_id, self.content_type),
                )
                conn.commit()
        except Exception as e:
            print(f"DB session init error: {e}")
        finally:
            conn.close()


SESSIONS: Dict[str, FeedbackSession] = {}


def get_or_create_session(session_id: str, user_id: Optional[int] = None, content_type: str = "image") -> FeedbackSession:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = FeedbackSession(session_id, user_id, content_type)
    return SESSIONS[session_id]


def log_message(db_session: FeedbackSession, role: str, message: str):
    db_session.logs.append(ConversationLog(role=role, message=message))
    try:
        conn = db.get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (db_session.session_id, role, message),
            )
            conn.commit()
    except Exception as e:
        print(f"DB message log error: {e}")
    finally:
        conn.close()


def run_completion_bg(db_session: FeedbackSession):
    """Generate summary and persist everything to Neon DB in a background thread."""
    import json
    try:
        summary = generate_session_summary(db_session.logs)
        db_session.summary_json = json.dumps(summary)
        db_session.overall_rating = summary.get("rating", None)

        conn = db.get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE sessions SET
                       state = 'END',
                       overall_rating = %s,
                       summary_json = %s,
                       completed_at = NOW()
                   WHERE session_id = %s""",
                (db_session.overall_rating, db_session.summary_json, db_session.session_id),
            )

            # ── Populate session_summaries table ────────────────────────
            strengths = summary.get("model_strengths", [])
            weaknesses = summary.get("model_weaknesses", [])
            # Derive strengths/weaknesses from key_issues + sentiment if LLM didn't provide them
            if not strengths:
                sentiment = (summary.get("sentiment") or "").lower()
                if "positive" in sentiment:
                    strengths = ["Good user experience", "Met expectations"]
                else:
                    strengths = ["Responsive feedback collection"]
            if not weaknesses:
                weaknesses = summary.get("key_issues", [])[:3] or ["No specific weaknesses noted"]

            cur.execute(
                """INSERT INTO session_summaries
                   (session_id, user_id, content_type, sentiment, rating,
                    user_interest, interaction_summary, model_strengths,
                    model_weaknesses, key_issues, suggestions, conversation_highlights)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (session_id) DO UPDATE SET
                    sentiment = EXCLUDED.sentiment,
                    rating = EXCLUDED.rating,
                    user_interest = EXCLUDED.user_interest,
                    interaction_summary = EXCLUDED.interaction_summary,
                    model_strengths = EXCLUDED.model_strengths,
                    model_weaknesses = EXCLUDED.model_weaknesses,
                    key_issues = EXCLUDED.key_issues,
                    suggestions = EXCLUDED.suggestions,
                    conversation_highlights = EXCLUDED.conversation_highlights""",
                (
                    db_session.session_id,
                    db_session.user_id,
                    db_session.content_type,
                    summary.get("sentiment"),
                    db_session.overall_rating,
                    summary.get("user_interest"),
                    summary.get("interaction_summary"),
                    strengths,
                    weaknesses,
                    summary.get("key_issues", []),
                    summary.get("suggestions"),
                    json.dumps(summary.get("conversation_highlights", [])),
                ),
            )

            conn.commit()
        print(f"Session {db_session.session_id} completed and saved to DB.")
    except Exception as e:
        print(f"DB completion save error: {e}")
    finally:
        conn.close()


def process_message(
    session_id: str,
    message: str,
    image_base64: str = None,
    user_id: int = None,
    content_type: str = "image",
) -> str:
    db_session = get_or_create_session(session_id, user_id, content_type)

    if db_session.state == "END":
        return "Your feedback has already been successfully recorded. Thank you!"

    if len(db_session.logs) == 0 and not message:
        initial_msg = (
            "Hi, I'm your AI feedback assistant. I'll be collecting your feedback "
            "on the image generation feature to help improve its quality and reliability. "
            "This session may be recorded for evaluation purposes. Would you like to continue?"
        )
        log_message(db_session, "AI", initial_msg)
        return initial_msg

    if message:
        log_message(db_session, "USER", message)
    elif image_base64:
        log_message(db_session, "USER", "[User uploaded an image]")

    ai_response = generate_heurisense_response(db_session.logs, image_base64)
    log_message(db_session, "AI", ai_response)

    end_phrases = [
        "thank you for your feedback",
        "session is complete",
        "have a great day",
        "your responses have been recorded",
    ]
    if any(phrase in ai_response.lower() for phrase in end_phrases):
        db_session.state = "END"
        threading.Thread(target=run_completion_bg, args=(db_session,), daemon=True).start()

    return ai_response
