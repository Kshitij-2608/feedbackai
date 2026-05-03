import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

ADMIN_EMAIL = "admin@heurisense.ai"
ADMIN_PASSWORD = "HeuriAdmin@2026"
ADMIN_NAME = "HeuriSense Admin"


def get_connection():
    """Return a new psycopg2 connection to Neon."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def init_db():
    """Create all required tables if they don't exist."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    is_admin BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100) UNIQUE NOT NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    state VARCHAR(20) DEFAULT 'ACTIVE',
                    content_type VARCHAR(20) DEFAULT 'image',
                    overall_rating INTEGER,
                    summary_json TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    completed_at TIMESTAMPTZ
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100) NOT NULL,
                    role VARCHAR(10) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS session_summaries (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(100) UNIQUE NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    content_type VARCHAR(20) DEFAULT 'image',
                    sentiment VARCHAR(30),
                    rating INTEGER,
                    user_interest TEXT,
                    interaction_summary TEXT,
                    model_strengths TEXT[],
                    model_weaknesses TEXT[],
                    key_issues TEXT[],
                    suggestions TEXT,
                    conversation_highlights JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            conn.commit()

            # ── Migrations for existing tables ──────────────────────────
            try:
                cur.execute("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS
                    is_admin BOOLEAN DEFAULT FALSE
                """)
                conn.commit()
            except Exception:
                conn.rollback()

            try:
                cur.execute("""
                    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
                    content_type VARCHAR(20) DEFAULT 'image'
                """)
                conn.commit()
            except Exception:
                conn.rollback()

            # ── Seed admin account ──────────────────────────────────────
            _seed_admin(cur, conn)

            print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Database initialization error: {e}")
        conn.rollback()
    finally:
        conn.close()


def _seed_admin(cur, conn):
    """Create the default admin account if it doesn't exist."""
    import hashlib
    import bcrypt

    cur.execute("SELECT id FROM users WHERE email = %s", (ADMIN_EMAIL,))
    if cur.fetchone():
        # Ensure existing account has admin flag
        cur.execute("UPDATE users SET is_admin = TRUE WHERE email = %s", (ADMIN_EMAIL,))
        conn.commit()
        return

    # Hash the password (same method as auth.py)
    prehashed = hashlib.sha256(ADMIN_PASSWORD.encode("utf-8")).hexdigest().encode("utf-8")
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(prehashed, salt).decode("utf-8")

    cur.execute(
        "INSERT INTO users (name, email, password_hash, is_admin) VALUES (%s, %s, %s, TRUE)",
        (ADMIN_NAME, ADMIN_EMAIL, password_hash),
    )
    conn.commit()
    print(f"Admin account seeded: {ADMIN_EMAIL}")
