import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


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
            conn.commit()
            # Migration: add content_type column if missing
            try:
                cur.execute("""
                    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS
                    content_type VARCHAR(20) DEFAULT 'image'
                """)
                conn.commit()
            except Exception:
                conn.rollback()
            print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Database initialization error: {e}")
        conn.rollback()
    finally:
        conn.close()
