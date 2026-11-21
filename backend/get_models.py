import os
import sys
sys.path.insert(0, os.path.dirname(__file__) if '__file__' in dir() else '.')

from dotenv import load_dotenv
load_dotenv()

from google import genai

API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)

print("Getting available models...")
models = client.models.list()
generate_content_models = []
for m in models:
    if hasattr(m, 'supported_actions') and 'generateContent' in m.supported_actions:
        generate_content_models.append(m.name.split('/')[-1] if '/' in m.name else m.name)

print("\nAvailable models supporting generateContent:")
for name in generate_content_models:
    print(name)