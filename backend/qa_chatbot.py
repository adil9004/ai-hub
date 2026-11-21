import os
from google import genai
from fastapi import HTTPException

from research_agent import _call_gemini_content, GEMINI_MODELS

API_KEY = os.getenv("GEMINI_API_KEY")


def _parse_gemini_error(e, model_name):
    """Formats Gemini error into ONE line without printing API key."""
    err_str = str(e)
    status_code = getattr(e, "code", "UNKNOWN")
    status_text = getattr(e, "status", getattr(e, "message", "Error"))
    if status_code == "UNKNOWN":
        for code in ["429", "404", "503", "500", "400", "403"]:
            if code in err_str:
                status_code = code
                break
    msg_cleaned = err_str.replace(API_KEY, "[REDACTED]") if API_KEY else err_str
    first_200 = msg_cleaned[:200]
    return f"GEMINI ERROR: {status_code} {status_text} | {first_200} | model={model_name}"


def ask_document_question(client, document_text, question, chat_history=None):
    """Sends the document text, question, and optional chat history to Gemini
    with strict system-style instructions to answer only based on the document content.
    Supports model fallback across GEMINI_MODELS.
    """
    history_context = ""
    if chat_history:
        history_context = "Previous conversation history:\n"
        for msg in chat_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_context += f"{role}: {msg.get('content', '')}\n"
    history_context += "\n"

    prompt = f"""
You are an AI document assistant. Your task is to answer user questions accurately based on the provided document.

SYSTEM INSTRUCTIONS:
1. Answer strictly based on the content present in the Document Text provided below.
2. Do NOT use outside knowledge or make assumptions beyond what is explicitly stated in the document.
3. If the information needed to answer the question is not present in the document, you MUST explicitly state: "I don't see that information in this document" (or include that exact phrase clearly in your response).
4. Keep your response clear, concise, and direct.

Document Text:
{document_text}

{history_context}Current Question:
{question}
"""

    for i, model_name in enumerate(GEMINI_MODELS):
        try:
            return _call_gemini_content(prompt)
        except HTTPException as he:
            if i + 1 < len(GEMINI_MODELS):
                print(f"GEMINI SWITCH: {model_name} -> {GEMINI_MODELS[i+1]}")
                continue
            raise
        except Exception as e:
            err_msg = str(e).lower()
            code = str(getattr(e, "code", ""))
            # Check for errors that should trigger a model switch
            should_switch = False
            if "404" in code or "404" in err_msg:
                should_switch = True
            elif "429" in code or "429" in err_msg or "resource_exhausted" in err_msg:
                should_switch = True
            elif "500" in code or "500" in err_msg:
                should_switch = True
            elif "503" in code or "503" in err_msg:
                should_switch = True
            elif "504" in code or "504" in err_msg or "timeout" in err_msg:
                should_switch = True
            
            if should_switch and i + 1 < len(GEMINI_MODELS):
                print(f"GEMINI SWITCH: {model_name} -> {GEMINI_MODELS[i+1]}")
                continue
            else:
                short_err = _parse_gemini_error(e, model_name)
                print(short_err)

    raise HTTPException(
        status_code=503,
        detail="AI service busy, please try again in a minute."
    )