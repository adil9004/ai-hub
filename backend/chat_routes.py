import os
import traceback
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from auth import get_current_user

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

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=500,
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        )
        return {"reply": response.text}
    except Exception as e:
        print("Chat API Error:", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating a response. Please try again."
        )


