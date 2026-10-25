from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback

from research_agent import run_agent


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str
    depth: str  # "Quick" or "Deep"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/research")
def research(request: ResearchRequest):
    try:
        final_answer, steps = run_agent(topic=request.topic, depth=request.depth)
        return {"report": final_answer, "steps": steps}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))