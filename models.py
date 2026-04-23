from pydantic import BaseModel
from typing import Optional

# Pydantic Models for API validation
class ChatRequest(BaseModel):
    session_id: str
    message: str
    image_base64: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    message: str
