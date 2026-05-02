import os
import hashlib
import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from jose import JWTError, jwt
from models import UserCreate, UserLogin, TokenResponse, UserInfo
import db

JWT_SECRET = os.getenv("JWT_SECRET", "heurisense_default_secret")
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24 * 7  # 7 days

security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/api/auth")


def _prehash(password: str) -> str:
    """SHA-256 pre-hash to bypass bcrypt's 72-byte truncation limit."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    prehashed = _prehash(password).encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(prehashed, salt).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        prehashed = _prehash(plain).encode('utf-8')
        return bcrypt.checkpw(prehashed, hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    return {"user_id": int(payload["sub"]), "email": payload["email"]}


@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserCreate):
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (data.email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")
            hashed = hash_password(data.password)
            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (data.name, data.email, hashed),
            )
            user_id = cur.fetchone()["id"]
            conn.commit()
        token = create_token(user_id, data.email)
        return TokenResponse(token=token, name=data.name, email=data.email, user_id=user_id)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")
    finally:
        conn.close()


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, password_hash FROM users WHERE email = %s",
                (data.email,),
            )
            user = cur.fetchone()
            if not user or not verify_password(data.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_token(user["id"], user["email"])
        return TokenResponse(token=token, name=user["name"], email=user["email"], user_id=user["id"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
    finally:
        conn.close()


@router.get("/me", response_model=UserInfo)
async def me(current_user: dict = Depends(get_current_user)):
    conn = db.get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, created_at FROM users WHERE id = %s",
                (current_user["user_id"],),
            )
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return UserInfo(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                created_at=str(user["created_at"]),
            )
    finally:
        conn.close()
