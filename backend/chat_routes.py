import os
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from auth import get_current_user
from research_agent import _call_gemini, _call_gemini_content, GEMINI_MODELS, _parse_gemini_error

router = APIRouter(prefix="/api")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None

@router.post("/chat")
def chat_endpoint(req: ChatRequest, current_user: str = Depends(get_current_user)):
    try:
        raw_history = req.history or []
        
        formatted_history = []
        for msg in raw_history:
            content = (msg.content or "").strip()
            if not content:
                continue
            
            # Map role
            role = "model" if msg.role in ["assistant", "ai", "model"] else "user"
            
            formatted_history.append({"role": role, "content": content})
        
        # Deduplicate if current message is already at the end of history
        if formatted_history and formatted_history[-1]["role"] == "user" and formatted_history[-1]["content"] == req.message.strip():
            formatted_history.pop()

        # Drop leading 'model' messages so history starts with a 'user' message
        while formatted_history and formatted_history[0]["role"] == "model":
            formatted_history.pop(0)

        # Slice to recent history
        formatted_history = formatted_history[-6:]
        
        # Re-check leading 'model' messages after slicing
        while formatted_history and formatted_history[0]["role"] == "model":
            formatted_history.pop(0)

        # Build prompt string
        prompt = "You are a helpful and concise AI assistant. Provide short, clear answers for simple questions.\n\n"
        for msg in formatted_history:
            r = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{r}: {msg['content']}\n"
        
        current_msg = req.message.strip()
        prompt += f"User: {current_msg}\nAssistant:"

        config = types.GenerateContentConfig(
            temperature=0.0
        )

        response_text, _ = _call_gemini_content(
            prompt,
            config
        )
        return {"reply": response_text}
    except HTTPException as he:
        raise he
    except Exception as e:
        short_err = _parse_gemini_error(e, GEMINI_MODELS[0] if GEMINI_MODELS else "unknown")
        print(short_err)
        raise HTTPException(
            status_code=429,
            detail=short_err
        )




