import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
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

STATIC_DIR = BASE_DIR / "static"
if not STATIC_DIR.exists():
    STATIC_DIR.mkdir(parents=True)

# Include auth router
app.include_router(auth.router)


@app.on_event("startup")
async def startup():
    db.init_db()


# ── Explicit static file routes (Vercel-compatible) ─────────────────────────
# These explicit endpoints ensure CSS/JS are served with correct MIME types
# even when Vercel's serverless runtime doesn't support StaticFiles mount.

MIME_MAP = {
    ".css": "text/css",
    ".js": "application/javascript",
    ".html": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


@app.get("/static/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files explicitly for Vercel compatibility."""
    full_path = STATIC_DIR / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    # Security: prevent path traversal
    try:
        full_path.resolve().relative_to(STATIC_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden")
    suffix = full_path.suffix.lower()
    content_type = MIME_MAP.get(suffix, "application/octet-stream")
    content = full_path.read_bytes()
    return Response(content=content, media_type=content_type)


@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = STATIC_DIR / "index.html"
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()


@app.get("/api/chat/init")
async def init_chat(session_id: str, user_id: int = None, content_type: str = "image"):
    db_session = get_or_create_session(session_id, user_id, content_type)
    if db_session.state == "END":
        return ChatResponse(
            session_id=session_id,
            message="This session is now complete. Thank you for your time.",
        )
    if len(db_session.logs) == 0:
        response_text = process_message(session_id, "", None, user_id, content_type)
        return ChatResponse(session_id=session_id, message=response_text)
    return ChatResponse(session_id=session_id, message="Hi again, let's continue.")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response_text = process_message(
        request.session_id,
        request.message,
        request.image_base64,
        request.user_id,
        request.content_type or "image",
    )
    return ChatResponse(session_id=request.session_id, message=response_text)


@app.post("/api/chat/end")
async def end_session(session_id: str):
    """Force-end a session and trigger summary generation."""
    import threading
    from chatbot import run_completion_bg
    if session_id in SESSIONS:
        session = SESSIONS[session_id]
        if session.state != "END":
            session.state = "END"
            threading.Thread(target=run_completion_bg, args=(session,), daemon=True).start()
        return {"status": "ended", "session_id": session_id}
    # Try ending in DB directly
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE sessions SET state = 'END', completed_at = NOW() WHERE session_id = %s AND state != 'END'", (session_id,))
            conn.commit()
        return {"status": "ended", "session_id": session_id}
    finally:
        conn.close()

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


@app.get("/api/admin/stats")
async def admin_stats(current_user: dict = Depends(auth.require_admin)):
    """Return aggregated stats for the admin dashboard."""
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            # Overall stats
            cur.execute("SELECT COUNT(*) as total FROM sessions")
            total_sessions = cur.fetchone()["total"]

            cur.execute("SELECT AVG(overall_rating) as avg_rating FROM sessions WHERE overall_rating IS NOT NULL")
            avg_rating = cur.fetchone()["avg_rating"]
            avg_rating = round(float(avg_rating), 1) if avg_rating else 0

            cur.execute("SELECT COUNT(*) as completed FROM sessions WHERE state = 'END'")
            completed = cur.fetchone()["completed"]
            completion_rate = round((completed / total_sessions * 100), 1) if total_sessions > 0 else 0

            cur.execute("SELECT COUNT(DISTINCT user_id) as total_users FROM sessions WHERE user_id IS NOT NULL")
            total_users = cur.fetchone()["total_users"]

            # Stats by content type
            cur.execute("""
                SELECT COALESCE(content_type, 'image') as content_type,
                       COUNT(*) as count,
                       AVG(overall_rating) as avg_rating,
                       COUNT(CASE WHEN state = 'END' THEN 1 END) as completed
                FROM sessions
                GROUP BY COALESCE(content_type, 'image')
            """)
            by_type = []
            for row in cur.fetchall():
                by_type.append({
                    "content_type": row["content_type"],
                    "count": row["count"],
                    "avg_rating": round(float(row["avg_rating"]), 1) if row["avg_rating"] else 0,
                    "completed": row["completed"],
                })

            return {
                "total_sessions": total_sessions,
                "avg_rating": avg_rating,
                "completion_rate": completion_rate,
                "total_users": total_users,
                "by_content_type": by_type,
            }
    finally:
        conn.close()


@app.get("/api/admin/sessions")
async def admin_sessions(content_type: str = None, current_user: dict = Depends(auth.require_admin)):
    """Return all sessions, optionally filtered by content type."""
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            if content_type and content_type != "all":
                cur.execute(
                    """SELECT s.session_id, s.state, s.overall_rating, s.content_type,
                              s.created_at, s.completed_at, u.name as user_name
                       FROM sessions s
                       LEFT JOIN users u ON s.user_id = u.id
                       WHERE COALESCE(s.content_type, 'image') = %s
                       ORDER BY s.created_at DESC""",
                    (content_type,),
                )
            else:
                cur.execute(
                    """SELECT s.session_id, s.state, s.overall_rating, s.content_type,
                              s.created_at, s.completed_at, u.name as user_name
                       FROM sessions s
                       LEFT JOIN users u ON s.user_id = u.id
                       ORDER BY s.created_at DESC"""
                )
            rows = cur.fetchall()
            sessions = []
            for r in rows:
                sessions.append({
                    "session_id": r["session_id"],
                    "state": r["state"],
                    "overall_rating": r["overall_rating"],
                    "content_type": r["content_type"] or "image",
                    "user_name": r["user_name"] or "Anonymous",
                    "created_at": str(r["created_at"]),
                    "completed_at": str(r["completed_at"]) if r["completed_at"] else None,
                })
            return {"sessions": sessions}
    finally:
        conn.close()
