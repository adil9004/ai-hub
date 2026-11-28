import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import traceback

from research_agent import run_agent
from auth import create_user, get_user, verify_password, create_access_token, get_current_user, init_db as auth_init_db
from resume_routes import router as resume_router
from chat_routes import router as chat_router
from resume_db import init_db as resume_init_db

# Get backend directory for absolute paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Create tables and ensure demo user exists
    auth_init_db()
    resume_init_db()
    
    # Ensure demo user exists (idempotent)
    demo_exists = get_user("demo")
    if not demo_exists:
        create_user("demo", "demo1234")
    else:
        # Verify password is demo1234 (handle if it was changed)
        if not verify_password("demo1234", demo_exists["password_hash"]):
            # Delete and recreate if password mismatch
            import sqlite3
            db_path = os.path.join(BACKEND_DIR, "users.db")
            conn = sqlite3.connect(db_path)
            conn.execute("DELETE FROM users WHERE username = 'demo'")
            conn.commit()
            conn.close()
            create_user("demo", "demo1234")

            create_user("demo", "demo1234")
    
    yield
    
    # Shutdown: Cleanup if needed (future use)

# Read allowed origins from environment variable
frontend_url = os.getenv("FRONTEND_URL", "")
allowed_origins = ["http://localhost:5173"]
if frontend_url:
    for origin in frontend_url.split(","):
        origin = origin.strip()
        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(resume_router)
app.include_router(chat_router)

security = HTTPBearer()


class ResearchRequest(BaseModel):
    topic: str
    depth: str  # "Quick" or "Deep"


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/register")
def register(req: RegisterRequest):
    if not (3 <= len(req.username) <= 30):
        raise HTTPException(status_code=400, detail="Username must be 3 to 30 characters")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    try:
        user_id = create_user(req.username, req.password)
    except ValueError:
        raise HTTPException(status_code=409, detail="Username already exists")
    token = create_access_token(req.username)
    return {"token": token}


@app.post("/api/login")
def login(req: LoginRequest):
    user = get_user(req.username)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(user["username"])
    return {"token": token}


@app.post("/api/research")
def research(request: ResearchRequest, current_user: str = Depends(get_current_user)):
    try:
        final_answer, steps = run_agent(topic=request.topic, depth=request.depth)
        return {"report": final_answer, "steps": steps}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))