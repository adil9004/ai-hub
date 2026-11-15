import os
import io
import json
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from google import genai
from google.genai import types
from dotenv import load_dotenv

from auth import get_current_user
from resume_db import save_analysis, get_all_analyses, delete_analysis
from resume_agent import run_agent_steps
from qa_chatbot import ask_document_question
from research_agent import _call_gemini

load_dotenv()

router = APIRouter(prefix="/api/resume")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def extract_text_from_pdf(file_bytes: bytes) -> str | None:
    """Reads a PDF file and pulls out all the text from every page."""
    try:
        import pdfplumber
        text = ""
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception:
        return None


def analyze_resume(resume_text: str) -> str:
    """Sends resume text to Gemini and asks for structured feedback."""
    prompt = f"""
    You are an expert resume reviewer and career coach.
    Analyze the following resume and respond in this exact structure:

    ## Overall Score
    Give a score out of 100 based on clarity, structure, and impact.

    ## Top 3 Strengths
    List them as bullet points.

    ## Top 3 Areas for Improvement
    List them as bullet points.

    ## Missing Keywords / Skills
    Suggest keywords that could help this resume pass ATS (Applicant
    Tracking System) filters for relevant roles.

    ## Example Rewrite
    Pick one weak bullet point from the resume and rewrite it to be
    stronger, showing a "Before" and "After".

    Resume:
    {resume_text}
    """
    try:
        response = _call_gemini(
            prompt,
            types.GenerateContentConfig(
                temperature=0.0,
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            )
        )
        return response.text
    except Exception as e:
        raise RuntimeError("Something went wrong while analyzing. Please try again in a moment.") from e


@router.post("/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    if file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="The uploaded file is too large. Please upload a PDF under 10MB.")

    file_bytes = await file.read()
    resume_text = extract_text_from_pdf(file_bytes)

    if resume_text is None or resume_text.strip() == "":
        raise HTTPException(status_code=400, detail="We couldn't read this PDF. Please try a different file or make sure it's not a scanned image.")

    result = analyze_resume(resume_text)
    save_analysis(file.filename, resume_text, result, current_user)

    return {"filename": file.filename, "analysis_result": result}


@router.get("/history")
def get_history(current_user: str = Depends(get_current_user)):
    analyses = get_all_analyses(current_user)
    return [
        {
            "id": row["id"],
            "filename": row["filename"],
            "timestamp": row["timestamp"],
            "analysis_result": row["analysis_result"]
        }
        for row in analyses
    ]


@router.delete("/history/{analysis_id}")
def delete_history(analysis_id: int, current_user: str = Depends(get_current_user)):
    delete_analysis(analysis_id, current_user)
    return {"message": "Analysis deleted successfully"}


@router.post("/job-assistant")
async def job_assistant_endpoint(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    current_user: str = Depends(get_current_user)
):
    if file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="The uploaded file is too large. Please upload a PDF under 10MB.")

    file_bytes = await file.read()
    resume_text = extract_text_from_pdf(file_bytes)

    if resume_text is None or resume_text.strip() == "":
        raise HTTPException(status_code=400, detail="We couldn't read this PDF. Please try a different file or make sure it's not a scanned image.")

    results = {}
    agent_generator = run_agent_steps(client, job_description, resume_text)
    try:
        step_msg, results = next(agent_generator)
        while step_msg != "Complete":
            step_msg, results = next(agent_generator)
    except StopIteration:
        pass

    return {
        "step1": results.get("step1", ""),
        "step2": results.get("step2", ""),
        "step3": results.get("step3", ""),
        "step4": results.get("step4", ""),
    }


@router.post("/qa")
async def qa_endpoint(
    file: UploadFile = File(...),
    question: str = Form(...),
    chat_history: str = Form("[]"),
    current_user: str = Depends(get_current_user)
):
    file_bytes = await file.read()
    document_text = extract_text_from_pdf(file_bytes)

    if document_text is None or document_text.strip() == "":
        raise HTTPException(status_code=400, detail="We couldn't read this PDF. Please try a different file or make sure it's not a scanned image.")

    try:
        history = json.loads(chat_history)
    except json.JSONDecodeError:
        history = []

    max_retries = 2
    response = None
    error_to_show = None

    for attempt in range(max_retries + 1):
        try:
            response = ask_document_question(client, document_text, question, history)
            break
        except Exception as e:
            err_str = str(e)
            if e.__cause__:
                err_str += " " + str(e.__cause__)

            is_retryable = "503" in err_str or "429" in err_str
            if is_retryable and attempt < max_retries:
                time.sleep(2)
                continue
            else:
                error_to_show = e
                break

    if response is not None:
        return {"answer": response}
    else:
        raise HTTPException(status_code=500, detail="⚠️ I'm sorry, but I'm having trouble connecting to the service right now. Please try asking your question again in a moment.")