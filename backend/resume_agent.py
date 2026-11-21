import hashlib
import time
from dotenv import load_dotenv
from google.genai import types
from research_agent import _call_gemini_content, GEMINI_MODELS
from fastapi import HTTPException

load_dotenv()

_resume_cache = {}

def _resume_key(resume_text, job_description):
    combined = resume_text + '|||' + job_description
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()

def _resume_agent(resume_text, job_description):
    cache_key = _resume_key(resume_text, job_description)
    if cache_key in _resume_cache:
        cached_item = _resume_cache[cache_key]
        return cached_item['text'], cached_item['model']
    
    start_time = time.time()
    print('JOB ASSISTANT: Analyzing resume and job description...')
    
    prompt = f"""Analyze the resume against the job description and provide four sections.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Provide your response in this exact format with these four sections and headings:

## Analysis

Extract key requirements from the job description including technical skills, soft skills, experience level, and core responsibilities.

## Gap Match

Compare the key job requirements against the candidate resume. Identify matched skills, gaps, and alignment score.

## Cover Letter

Write a tailored cover letter with placeholder names.

## Resume Edits

Suggest at least 3 bullet point edits with before, after, and explanation.
"""
    
    config = types.GenerateContentConfig(temperature=0.0, max_output_tokens=3000)
    
    try:
        response_text, used_model = _call_gemini_content(prompt, config)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail='AI service busy, please try again in a minute.') from e
    
    _resume_cache[cache_key] = {'text': response_text, 'model': used_model}
    
    elapsed = time.time() - start_time
    print(f'JOB ASSISTANT DONE in {elapsed:.1f}s using {used_model}')
    
    return response_text
