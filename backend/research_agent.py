import os
import json
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from tools import web_search, fetch_page
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback
from fastapi import HTTPException

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(timeout=15000)  # 15 seconds timeout
)

MODELS_ENV = os.getenv("GEMINI_MODELS", "gemini-3.5-flash,gemini-3.8-flash")
GEMINI_MODELS = [m.strip() for m in MODELS_ENV.split(",") if m.strip()]

# Research-specific models (models that support tools/function-calling)
RESEARCH_MODELS_ENV = os.getenv("GEMINI_RESEARCH_MODELS", "gemini-1.5-pro,gemini-1.5-flash")
GEMINI_RESEARCH_MODELS = [m.strip() for m in RESEARCH_MODELS_ENV.split(",") if m.strip()]

EXHAUSTED_MODELS = {}  # model_name: timestamp

def _is_exhausted(model_name):
    if model_name in EXHAUSTED_MODELS:
        if time.time() - EXHAUSTED_MODELS[model_name] < 300:  # 5 minutes
            return True
        else:
            del EXHAUSTED_MODELS[model_name]
    return False

def _mark_exhausted(model_name):
    if model_name not in EXHAUSTED_MODELS:
        print(f"GEMINI SKIP: {model_name} exhausted")
    EXHAUSTED_MODELS[model_name] = time.time()


def _parse_gemini_error(e, model_name):
    """Formats Gemini error into ONE line without printing API key."""
    err_str = str(e)
    status_code = getattr(e, "code", None)
    if status_code is None:
        status_code = "UNKNOWN"
    else:
        status_code = str(status_code)
    status_text = getattr(e, "status", getattr(e, "message", "Error"))
    # Check for specific error codes in the message
    if status_code == "UNKNOWN":
        for code in ["429", "404", "500", "503", "504", "DEADLINE_EXCEEDED", "UNAVAILABLE"]:
            if code in err_str:
                status_code = code
                break
    msg_cleaned = err_str.replace(API_KEY, "[REDACTED]") if API_KEY else err_str
    first_200 = msg_cleaned[:200]
    return f"GEMINI ERROR: {status_code} {status_text} | {first_200} | model={model_name}"


def _call_gemini(contents, config=None):
    """Call Gemini with fallback across GEMINI_MODELS.
    On 404, 429, 500, 503, 504 or timeout: switch immediately to next model.
    Prints "GEMINI SWITCH: <old> -> <new>" on switch.
    Prints "GEMINI ERROR: <code> <status> | <msg> | model=<name>" for each failed model.
    When all models fail, raise HTTPException(status_code=503, detail="AI service busy, please try again in a minute.").
    Never turns a 404 into a 429.
    """
    for i, model_name in enumerate(GEMINI_MODELS):
        kwargs = {"config": config} if config else {}
        try:
            response = client.models.generate_content(model=model_name, contents=contents, **kwargs)
            return response
        except Exception as e:
            err_str = str(e)
            status_code = getattr(e, "code", None)
            if status_code is None:
                status_code = "UNKNOWN"
            else:
                status_code = str(status_code)
            status_text = getattr(e, "status", getattr(e, "message", "Error"))
            if status_code == "UNKNOWN":
                for code in ["429", "404", "500", "503", "504", "DEADLINE_EXCEEDED", "UNAVAILABLE"]:
                    if code in err_str:
                        status_code = code
                        break
            print(f"GEMINI ERROR: {status_code} {status_text} | {err_str[:200]} | model={model_name}")
            should_switch = False
            if status_code == "404":
                should_switch = True
            elif status_code in ["429", "503", "500", "504", "DEADLINE_EXCEEDED", "UNAVAILABLE"]:
                should_switch = True
            elif "resource_exhausted" in err_str.lower():
                should_switch = True
            elif "timeout" in err_str.lower() or "timed out" in err_str.lower():
                should_switch = True
            
            if should_switch and i + 1 < len(GEMINI_MODELS):
                print(f"GEMINI SWITCH: {model_name} -> {GEMINI_MODELS[i+1]}")
                continue
            elif should_switch:
                # This was the last model, will fail again and raise below
                pass
    
    raise HTTPException(
        status_code=503,
        detail="AI service busy, please try again in a minute."
    )


def _call_gemini_research(contents, config=None):
    """Call Gemini using research-specific models that support tools.
    Returns tuple: (response_text, model_name)
    """
    for i, model_name in enumerate(GEMINI_RESEARCH_MODELS):
        kwargs = {"config": config} if config else {}
        try:
            response = client.models.generate_content(model=model_name, contents=contents, **kwargs)
            return response.text, model_name
        except Exception as e:
            err_str = str(e)
            status_code = getattr(e, "code", None)
            if status_code is None:
                status_code = "UNKNOWN"
            else:
                status_code = str(status_code)
            status_text = getattr(e, "status", getattr(e, "message", "Error"))
            if status_code == "UNKNOWN":
                for code in ["429", "404", "500", "503", "504", "DEADLINE_EXCEEDED", "UNAVAILABLE"]:
                    if code in err_str:
                        status_code = code
                        break
            print(f"GEMINI ERROR: {status_code} {status_text} | {err_str[:200]} | model={model_name}")
            should_switch = False
            if status_code == "404":
                should_switch = True
            elif status_code in ["429", "503", "500", "504", "DEADLINE_EXCEEDED", "UNAVAILABLE"]:
                should_switch = True
            elif "resource_exhausted" in err_str.lower():
                should_switch = True
            elif "timeout" in err_str.lower() or "timed out" in err_str.lower():
                should_switch = True
            if should_switch and i + 1 < len(GEMINI_RESEARCH_MODELS):
                print(f"GEMINI SWITCH: {model_name} -> {GEMINI_RESEARCH_MODELS[i+1]}")
                continue
    raise HTTPException(status_code=503, detail="AI service busy, please try again in a minute.")


def _call_gemini_content(contents, config=None):
    """Call Gemini and return the response text directly.
    On 404, 429, 500, 503, 504 or timeout: switch immediately to next model.
    Prints "GEMINI SWITCH: <old> -> <new>" on switch.
    When all models fail, raise HTTPException(status_code=503, detail="AI service busy, please try again in a minute.").
    Never turns a 404 into a 429.
    Returns tuple: (response_text, model_name)
    """
    for i, model_name in enumerate(GEMINI_MODELS):
        kwargs = {"config": config} if config else {}
        try:
            response = client.models.generate_content(model=model_name, contents=contents, **kwargs)
            return response.text, model_name
        except Exception as e:
            err_msg = str(e).lower()
            code = str(getattr(e, "code", ""))
            should_switch = False
            if code == "404" or "404" in err_msg:
                should_switch = True
            elif code == "429" or "429" in err_msg or "resource_exhausted" in err_msg:
                should_switch = True
            elif code == "500" or "500" in err_msg:
                should_switch = True
            elif code == "503" or "503" in err_msg:
                should_switch = True
            elif code == "504" or "504" in err_msg or "timeout" in err_msg or "timed out" in err_msg or "deadline_exceeded" in err_msg:
                should_switch = True
            if should_switch and i + 1 < len(GEMINI_MODELS):
                print(f"GEMINI SWITCH: {model_name} -> {GEMINI_MODELS[i+1]}")
                continue
    raise HTTPException(status_code=503, detail="AI service busy, please try again in a minute.")


def run_agent(topic, depth="Quick", on_step=None):
    try:
        steps = []
        total_start = time.time()
        num_queries = 2 if depth == "Quick" else 4
        num_pages = 3 if depth == "Quick" else 6
        step_a_start = time.time()
        print(f"Step (a): Generating {num_queries} search queries...")
        query_prompt = f"Generate {num_queries} short web search queries for researching the topic: {topic}. Return as a JSON list of strings."
        query_text, used_model = _call_gemini_research(
            query_prompt,
            types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0)
        )
        try:
            queries = json.loads(query_text)
            if not isinstance(queries, list):
                queries = []
            queries = [str(q) for q in queries[:num_queries] if q]
        except (json.JSONDecodeError, TypeError):
            queries = []
        if not queries:
            queries = [topic]
        for q in queries:
            step_msg = f"Searched: {q}"
            steps.append(step_msg)
            if on_step:
                on_step(step_msg)
        step_b_start = time.time()
        print("Step (b): Running web searches...")
        all_search_results = []
        for q in queries:
            results = web_search(q)
            all_search_results.extend(results)
        top_urls = [r.get("url") for r in all_search_results[:num_pages] if r.get("url")]
        step_b_elapsed = time.time() - step_b_start
        print(f"Step (b) took {step_b_elapsed:.2f} seconds")
        step_c_start = time.time()
        print("Step (c): Fetching pages in parallel...")
        fetched_texts = []
        with ThreadPoolExecutor(max_workers=min(num_pages, 6)) as executor:
            future_to_url = {executor.submit(fetch_page, url): url for url in top_urls}
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    text = future.result()
                except Exception as e:
                    text = f"Error: {e}"
                step_msg = f"Read: {url}"
                steps.append(step_msg)
                if on_step:
                    on_step(step_msg)
                if not text.startswith("Error:"):
                    fetched_texts.append((url, text))
        step_c_elapsed = time.time() - step_c_start
        print(f"Step (c) took {step_c_elapsed:.2f} seconds")
        used_urls = [url for url, _ in fetched_texts]
        if used_urls:
            labeled_pages = []
            for url, text in fetched_texts:
                labeled_pages.append(f"URL: {url}\n{text}")
            combined_text = "\n\n---\n\n".join(labeled_pages)
        else:
            combined_text = ""
        if not combined_text:
            snippets = [r.get("snippet", "") for r in all_search_results if r.get("snippet")]
            if snippets:
                combined_text = "\n\n".join(snippets)
                used_urls = []
            else:
                final_answer = "No search results were found for this topic. Try rephrasing it."
                return final_answer, steps
        step_d_start = time.time()
        print("Step (d): Generating final report...")
        final_prompt = f"""Research the topic: {topic}

Here is the information gathered from the web:

{combined_text}

Write a short bullet-point report using only the page texts provided. Do NOT write a Sources section."""
        final_answer, used_model = _call_gemini_research(
            final_prompt,
            types.GenerateContentConfig(temperature=0.0)
        )
        if used_urls:
            sources_section = "\n\n## Sources\n" + "\n".join([f"- {url}" for url in used_urls])
            final_answer = final_answer + sources_section
        step_d_elapsed = time.time() - step_d_start
        print(f"Step (d) took {step_d_elapsed:.2f} seconds")
        total_elapsed = time.time() - total_start
        print(f"Total execution took {total_elapsed:.2f} seconds")
        return final_answer, steps
    except Exception:
        traceback.print_exc()
        raise