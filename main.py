import json
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from models import ChatRequest, ChatResponse
from chatbot import process_message, get_or_create_session, SESSIONS
import db
import auth

app = FastAPI(title="HeuriSense Feedback API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include auth router
app.include_router(auth.router)


@app.on_event("startup")
async def startup():
    db.init_db()


@app.get("/", response_class=HTMLResponse)
async def read_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/api/chat/init")
async def init_chat(session_id: str, user_id: int = None):
    db_session = get_or_create_session(session_id, user_id)
    if db_session.state == "END":
        return ChatResponse(
            session_id=session_id,
            message="This session is now complete. Thank you for your time.",
        )
    if len(db_session.logs) == 0:
        response_text = process_message(session_id, "", None, user_id)
        return ChatResponse(session_id=session_id, message=response_text)
    return ChatResponse(session_id=session_id, message="Hi again, let's continue.")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response_text = process_message(
        request.session_id,
        request.message,
        request.image_base64,
        request.user_id,
    )
    return ChatResponse(session_id=request.session_id, message=response_text)


@app.get("/api/summary/{session_id}")
async def get_summary(session_id: str):
    """Get the AI-generated summary for a completed session."""
    # Check in-memory cache first
    if session_id in SESSIONS:
        session = SESSIONS[session_id]
        if session.summary_json:
            return {
                "session_id": session_id,
                "summary": json.loads(session.summary_json),
                "state": session.state,
            }

    # Fall back to DB
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT state, summary_json, overall_rating FROM sessions WHERE session_id = %s",
                (session_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Session not found")
            if not row["summary_json"]:
                return {
                    "session_id": session_id,
                    "summary": None,
                    "state": row["state"],
                    "message": "Summary is being generated, please wait a moment.",
                }
            return {
                "session_id": session_id,
                "summary": json.loads(row["summary_json"]),
                "state": row["state"],
            }
    finally:
        conn.close()


@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(auth.get_current_user)):
    """Return all past sessions for the authenticated user."""
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT session_id, state, overall_rating, created_at, completed_at
                   FROM sessions
                   WHERE user_id = %s
                   ORDER BY created_at DESC""",
                (current_user["user_id"],),
            )
            rows = cur.fetchall()
            sessions = []
            for r in rows:
                sessions.append({
                    "session_id": r["session_id"],
                    "state": r["state"],
                    "overall_rating": r["overall_rating"],
                    "created_at": str(r["created_at"]),
                    "completed_at": str(r["completed_at"]) if r["completed_at"] else None,
                })
            return {"sessions": sessions}
    finally:
        conn.close()
