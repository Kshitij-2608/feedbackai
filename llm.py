import os
import json
import base64
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY not found in environment")

client = genai.Client(api_key=api_key)
MODEL = "gemini-2.0-flash"  # 1500 RPD free tier (vs 20 RPD for 2.5-flash)

MAX_RETRIES = 3


def _generate_with_retry(model, contents, retries=MAX_RETRIES):
    """Call generate_content with automatic retry on 429 rate-limit errors."""
    for attempt in range(retries):
        try:
            return client.models.generate_content(model=model, contents=contents)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                wait = min(2 ** attempt * 5, 60)  # 5s, 10s, 20s
                print(f"Rate limited (attempt {attempt+1}/{retries}), retrying in {wait}s...")
                time.sleep(wait)
                continue
            raise  # re-raise non-rate-limit errors
    # Final attempt without catching
    return client.models.generate_content(model=model, contents=contents)


# ── Helpers ───────────────────────────────────────────────────────────────────

def classify_intent(message: str, allowed_intents: list, context: str = "") -> str:
    prompt = f"""
You are an advanced intent classification system.
Context (Question asked to user): "{context}"
User Message: "{message}"
Classify into exactly ONE of these categories: {allowed_intents}
If it is off-topic, output "OFF_TOPIC". If it doesn't clearly fit, output "UNKNOWN".
Output format: ONLY the exact category string.
"""
    try:
        response = _generate_with_retry(model=MODEL, contents=prompt)
        intent = response.text.strip().upper()
        for ai_intent in allowed_intents + ["UNKNOWN", "OFF_TOPIC"]:
            if ai_intent in intent:
                return ai_intent
        return "UNKNOWN"
    except Exception as e:
        print(f"LLM Error: {e}")
        return "UNKNOWN"


def check_safety(message: str) -> bool:
    prompt = f"""
Evaluate if the following user message is highly offensive, abusive, or explicitly harmful.
Message: "{message}"
Output ONLY 'UNSAFE' if it involves hate speech, severe profanity, or explicit harm. Otherwise output 'SAFE'.
"""
    try:
        response = _generate_with_retry(model=MODEL, contents=prompt)
        return "UNSAFE" not in response.text.upper()
    except:
        return True


# ── Master Prompt ─────────────────────────────────────────────────────────────

HEURISENSE_MASTER_PROMPT = """
# HeuriSense – Master System Prompt for Conversational Feedback Agent

You are HeuriSense, a professional conversational AI feedback assistant.
Your job is to collect detailed, structured, and useful feedback about an AI system or generated output.

You are NOT a general chatbot. Stay focused on feedback collection only.

# Primary Rules
1. Stay focused only on feedback collection.
2. Ask only ONE main question at a time.
3. Keep responses under 3 sentences whenever possible.
4. Sound natural, polite, and human.
5. If the user goes off-topic, politely redirect them.
6. If the user becomes rude or frustrated, remain calm and empathetic.
7. Never argue with the user.

# Conversation Flow
Follow this flow smoothly:
1. Introduction and Consent
2. Overall Rating (1-5)
3. Positive Feedback or Main Issue (based on rating)
4. Clarification and Root Cause
5. Context of Usage
6. Severity and Impact
7. Suggestions for Improvement
8. Closing Summary — End with: "Thank you for your feedback! Your responses have been recorded and will help us improve."

# Image Analysis
If the user uploaded an image, analyze it visually and reference its contents naturally to initiate relevant feedback questions about what you observe.

# Output Style
- Keep responses under 3 sentences
- Ask only one main question at a time
- Sound natural and human
- Always begin follow-ups with a brief empathetic acknowledgment of the user's previous response
"""


def generate_heurisense_response(logs: list, image_base64: str = None) -> str:
    """Generate next conversation turn using HeuriSense master prompt."""
    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"

    prompt = f"""
{HEURISENSE_MASTER_PROMPT}

READ THE CHAT HISTORY BELOW.
Determine what stage of the conversation you are in, and generate the next MOST APPROPRIATE message.
If the user provided an image, analyze it and reference its contents naturally.

CHAT HISTORY:
{conversation_text}

Output ONLY your next message. Do not include any prefix like "AI:" or "HeuriSense:".
"""

    contents = [prompt]

    if image_base64:
        try:
            if "," in image_base64:
                format_str, data_str = image_base64.split(",", 1)
                mime_type = format_str.split(":")[1].split(";")[0]
            else:
                data_str = image_base64
                mime_type = "image/jpeg"
            image_bytes = base64.b64decode(data_str)
            contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        except Exception as e:
            print(f"Image decode error: {e}")

    try:
        response = _generate_with_retry(model=MODEL, contents=contents)
        return response.text.strip()
    except Exception as e:
        print(f"LLM Chat Error: {e}")
        return "I encountered an error. Could you please rephrase your response?"


def generate_session_summary(logs: list) -> dict:
    """Generate a rich structured summary after the interview ends."""
    if not logs:
        return {}

    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"

    prompt = f"""
You are an expert analyst reviewing a feedback interview transcript.
Generate a comprehensive session summary as a JSON object.

The JSON must have EXACTLY these keys:
- "user_interest": Brief description of what the user was trying to achieve or their main area of interest (1-2 sentences)
- "interaction_summary": 2-3 sentence summary of the overall conversation and what was discussed
- "sentiment": One of exactly: "Very Positive", "Positive", "Neutral", "Negative", "Very Negative"
- "rating": Integer 1-5 extracted from conversation (use 3 if not explicitly mentioned)
- "key_issues": Array of 2-4 strings describing the main issues or topics raised
- "suggestions": Key improvement suggestions mentioned by the user (1-2 sentences)
- "conversation_highlights": Array of 3-5 objects, each with "role" (string: "AI" or "USER") and "message" (string) keys, representing the most important exchanges

Interview Transcript:
{conversation_text}

Output ONLY valid JSON. No markdown. No code blocks. No extra text.
"""

    try:
        response = _generate_with_retry(model=MODEL, contents=prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Summary generation error: {e}")
        return {
            "user_interest": "Could not extract user interest.",
            "interaction_summary": "Summary generation encountered an error.",
            "sentiment": "Neutral",
            "rating": 3,
            "key_issues": ["Summary unavailable"],
            "suggestions": "N/A",
            "conversation_highlights": [],
        }


def extract_session_data(logs: list) -> dict:
    """Extract structured data from transcript (legacy support)."""
    if not logs:
        return {}
    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"

    prompt = f"""
Analyze this feedback interview transcript. Extract values as concisely as possible.
Output strictly as JSON with these keys:
- intended_goal, overall_rating (1-5 or 0), process_smoothness, main_issue,
  context_usage, severity, improvement_suggestions

Transcript:
{conversation_text}
"""
    try:
        response = _generate_with_retry(model=MODEL, contents=prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except Exception as e:
        print(f"Extraction Error: {e}")
        return {}
