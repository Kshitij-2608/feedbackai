from pydantic import BaseModel
from typing import Optional, List


# ── Chat ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message: str
    image_base64: Optional[str] = None
    user_id: Optional[int] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str


# ── Auth ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    name: str
    email: str
    user_id: int


class UserInfo(BaseModel):
    id: int
    name: str
    email: str
    created_at: str


# ── Summary ──────────────────────────────────────────────────────────────────
class SummaryResponse(BaseModel):
    session_id: str
    summary: Optional[dict] = None
    state: str
    message: Optional[str] = None
