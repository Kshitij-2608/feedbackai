from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
import os
import datetime

from models import ChatRequest, ChatResponse
from chatbot import process_message, get_or_create_session, SESSIONS
import io
import csv

app = FastAPI(title="Controlled Feedback API")

# Mount static folder for frontend
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html", "r") as f:
        return f.read()

@app.get("/api/chat/init")
async def init_chat(session_id: str):
    """Initialize a chat and get the first question based on state."""
    db_session = get_or_create_session(session_id)
    if db_session.state == "END":
         return ChatResponse(session_id=session_id, message="This session is now complete. Thank you for your time.")
    
    # Generate the very first intro using the backend processor
    if len(db_session.logs) == 0:
        response_text = process_message(session_id, "", None)
        return ChatResponse(session_id=session_id, message=response_text)
        
    return ChatResponse(session_id=session_id, message="Hi again, let's continue.")

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process user message and return chatbot response."""
    response_text = process_message(request.session_id, request.message, request.image_base64)
    return ChatResponse(session_id=request.session_id, message=response_text)

@app.get("/api/export/csv")
async def export_csv():
    """Export all feedback sessions as a CSV file."""
    sessions = list(SESSIONS.values())
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Session ID", "State", "Consent Given", "Image Selection", "Intended Goal", 
        "Expected Result", "Overall Rating", "Goal Achieved", "Process Smoothness", 
        "Positive Feedback", "Negative Feedback", "Context Usage", "Emotional Impact", 
        "Severity", "Reuse Intent", "Improvement Suggestions", "Conversation Summary"
    ])
    
    # Write rows
    for s in sessions:
        writer.writerow([
            s.session_id, s.state, s.consent_given, s.image_selection, s.intended_goal,
            s.expected_result, s.overall_rating, s.goal_achieved, s.process_smoothness,
            s.positive_feedback, s.negative_feedback, s.context_usage, s.emotional_impact,
            s.severity, s.reuse_intent, s.improvement_suggestions, s.conversation_summary
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=feedback_data_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.csv"}
    )
