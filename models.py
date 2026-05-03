from pydantic import BaseModel
from typing import Optional, List


# ── Chat ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message: str
    image_base64: Optional[str] = None
    user_id: Optional[int] = None
    content_type: Optional[str] = None  # image, document, audio, video, text


class ChatResponse(BaseModel):
    session_id: str
    message: str


# ── Auth ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    token: str
    name: str
    email: str
    user_id: int
    is_admin: bool = False


class UserInfo(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool = False
    created_at: str


# ── Summary ──────────────────────────────────────────────────────────────────
class SummaryResponse(BaseModel):
    session_id: str
    summary: Optional[dict] = None
    state: str
    message: Optional[str] = None
