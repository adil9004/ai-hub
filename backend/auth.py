import os
import sqlite3
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise ValueError("JWT_SECRET not found in environment variables")


def get_db():
    """Get a database connection."""
    db_path = os.path.join(os.path.dirname(__file__), "users.db")
    conn = sqlite3.connect(db_path, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the users table."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()


def create_user(username: str, password: str) -> int:
    """Create a new user. Returns the user id, or raises ValueError if username exists."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, hashed, datetime.now(timezone.utc).isoformat()),
        )
        user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except sqlite3.IntegrityError:
        conn.rollback()
        raise ValueError("Username already exists")
    finally:
        conn.close()


def get_user(username: str) -> dict | None:
    """Get a user by username. Returns dict with id, username, password_hash, created_at or None."""
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, password_hash, created_at FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "username": row[1], "password_hash": row[2], "created_at": row[3]}
    finally:
        conn.close()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(username: str) -> str:
    """Create a JWT access token with 24-hour expiry."""
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {"sub": username, "exp": expires}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> str:
    """Decode a JWT token and return the username. Raises jwt.InvalidTokenError if invalid."""
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload["sub"]


from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """FastAPI dependency that returns the username from a valid JWT token, or raises 401."""
    token = credentials.credentials
    try:
        username = decode_token(token)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return username