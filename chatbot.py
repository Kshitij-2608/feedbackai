from typing import Dict, List
import datetime
import threading
from llm import generate_heurisense_response, extract_session_data

class ConversationLog:
    def __init__(self, role: str, message: str):
        self.role = role
        self.message = message
        self.created_at = datetime.datetime.now()

class FeedbackSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.state = "ACTIVE"
        
        # New Detailed Tracking Fields (Populated at the end via extraction)
        self.consent_given = True
        self.image_selection = "Provided in chat"
        self.intended_goal = None
        self.expected_result = None
        self.overall_rating = None
        self.goal_achieved = None
        self.process_smoothness = None
        self.positive_feedback = None
        self.negative_feedback = None 
        self.context_usage = None
        self.emotional_impact = None
        self.severity = None
        self.reuse_intent = None
        self.improvement_suggestions = None
        self.conversation_summary = None
        
        self.logs: List[ConversationLog] = []

SESSIONS: Dict[str, FeedbackSession] = {}

def get_or_create_session(session_id: str) -> FeedbackSession:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = FeedbackSession(session_id)
    return SESSIONS[session_id]

def log_message(db_session: FeedbackSession, role: str, message: str):
    db_session.logs.append(ConversationLog(role=role, message=message))

def run_extraction_bg(db_session: FeedbackSession):
    """Run data extraction in background so we don't block the frontend response."""
    data = extract_session_data(db_session.logs)
    db_session.intended_goal = data.get("intended_goal", "")
    db_session.expected_result = data.get("intended_goal", "") 
    db_session.overall_rating = data.get("overall_rating", 0)
    db_session.process_smoothness = data.get("process_smoothness", "")
    db_session.negative_feedback = data.get("main_issue", "")
    db_session.context_usage = data.get("context_usage", "")
    db_session.severity = data.get("severity", "")
    db_session.improvement_suggestions = data.get("improvement_suggestions", "")
    db_session.conversation_summary = "Extracted successfully."

def process_message(session_id: str, message: str, image_base64: str = None) -> str:
    db_session = get_or_create_session(session_id)
    
    if db_session.state == "END":
        return "Your feedback has already been successfully recorded. Thank you!"

    # Give initial greeting if brand new empty logs
    if len(db_session.logs) == 0 and not message:
        initial_msg = "Hi, I'm your AI feedback assistant. I’ll be collecting your feedback on the image generation feature to help improve its quality and reliability. This session may be recorded for evaluation purposes. Would you like to continue?"
        log_message(db_session, "AI", initial_msg)
        return initial_msg

    if message:
        log_message(db_session, "USER", message)
    elif image_base64:
        log_message(db_session, "USER", "[User uploaded an image]")
        
    ai_response = generate_heurisense_response(db_session.logs, image_base64)
    log_message(db_session, "AI", ai_response)
    
    # Check if the conversation is ending (e.g. system says thank you for your feedback)
    if "Thank you for your feedback" in ai_response or "session is complete" in ai_response.lower() or "have a great day" in ai_response.lower():
        db_session.state = "END"
        # Spool up background thread to extract structured data for the CSV
        threading.Thread(target=run_extraction_bg, args=(db_session,)).start()
        
    return ai_response
