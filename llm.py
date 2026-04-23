import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("WARNING: GEMINI_API_KEY not found in environment")

# Using gemini-flash-latest as the fast, efficient model
model = genai.GenerativeModel('gemini-flash-latest')

def classify_intent(message: str, allowed_intents: list[str], context: str = "") -> str:
    """Classify user intent using LLM if rule-based fails."""
    prompt = f"""
You are an advanced intent classification system.
Context (Question asked to user): "{context}"
User Message: "{message}"

Classify into exactly ONE of these categories: {allowed_intents}
If it is off-topic, output "OFF_TOPIC".
If it doesn't clearly fit, output "UNKNOWN".

Output format: ONLY the exact category string. DO NOT include any extra text.
"""
    try:
        response = model.generate_content(prompt)
        intent = response.text.strip().upper()
        
        # Guardrail on AI output
        for ai_intent in allowed_intents + ["UNKNOWN", "OFF_TOPIC"]:
            if ai_intent in intent:
                return ai_intent
        return "UNKNOWN"
    except Exception as e:
         print(f"LLM Error: {e}")
         return "UNKNOWN"

def validate_system_response(response: str) -> str:
    """Interceptor layer to validate system response before sending to user."""
    prompt = f"""
Evaluate if the following AI system response is professional, safe, and contextually appropriate for a feedback agent.
Response: "{response}"
Output ONLY 'PASS' if safe and professional, or 'FAIL' if hallucinated, highly off-topic or inappropriate.
"""
    try:
        res = model.generate_content(prompt)
        if "FAIL" in res.text.upper():
            return "I apologize, but I am unable to provide a response at this moment. Let's start over."
        return response
    except:
        return response

def safe_rephrase(question: str) -> str:
    """Uses LLM to mildly rephrase a predefined question to sound natural."""
    prompt = f"""
You are a professional, polite feedback assistant. 
Rephrase the following prompt slightly to sound conversational, but keep the EXACT same meaning. Do not add extra information.
Prompt: "{question}"
"""
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"LLM Error: {e}")
        return question

def check_safety(message: str) -> bool:
     """Check if message is completely inappropriate."""
     prompt = f"""
Evaluate if the following user message is highly offensive, abusive, or explicitly harmful.
Message: "{message}"
Output ONLY 'UNSAFE' if it involves hate speech, severe profanity, or explicit harm. Otherwise output 'SAFE'.
"""
     try:
         response = model.generate_content(prompt)
         if "UNSAFE" in response.text.upper():
              return False
         return True
     except:
         return True

from pydantic import BaseModel
import base64

HEURISENSE_MASTER_PROMPT = """
# HeuriSense – Master System Prompt for Conversational Feedback Agent

You are HeuriSense, a professional conversational AI feedback assistant.
Your job is to collect detailed, structured, and useful feedback about an AI-generated image or output.

---
# Primary Rules
1. Stay focused only on feedback collection.
2. If the user goes off-topic, politely redirect them.
3. If the user becomes frustrated, remain calm and empathetic.
4. Keep questions short, natural, and conversational (under 3 sentences).
5. Ask only ONE main question at a time.
6. Avoid repetitive phrasing or sounding robotic.

---
# Dynamic Question Generation Strategy
DO NOT follow any fixed list of questions or stages. Instead, act as a responsive visual discussion engine.
- Your NEXT question must ALWAYS be directly based on the user's PREVIOUS answer. Dig deeper into whatever they just said.
- If the user just gave a 1-5 rating, ask a follow-up about why they gave that specific rating.
- Start your response with a quick, empathetic acknowledgment of their answer.
- Convert abstract complaints (e.g., "It looks weird") into measurable technical components (placement, texture, lighting, realism).

---
# Dynamic Conversation End
- Keep asking dynamic, follow-up questions until you feel you have fully understood their feedback, root cause, and suggestions.
- THERE IS NO FIXED QUESTION LIMIT. Keep going as long as the user provides meaningful feedback.
- ONCE you have collected complete, actionable feedback, give a brief final wrap-up thanking the user and stating the session is complete.
"""

def generate_opening_message(image_base64: str = None) -> str:
    """Generate the first message dynamically, analyzing the image if provided."""
    prompt = """
You are an AI feedback assistant starting a new session.
If the user provided an image, analyze it deeply and reference specific details you see in it.
IMPORTANT: Explicitly ask the user to rate the output from 1 to 5 based on what you observe.
Keep it friendly and concise (max 2-3 sentences).
Output ONLY your message.
"""
    parts = [prompt]
    if image_base64:
        if "," in image_base64:
            format_str, data_str = image_base64.split(",", 1)
            mime_type = format_str.split(":")[1].split(";")[0]
            try:
                parts.append({"mime_type": mime_type, "data": base64.b64decode(data_str)})
            except:
                pass
                
    try:
        response = model.generate_content(parts)
        return response.text.strip()
    except Exception as e:
        print(f"LLM Opening Error: {e}")
        return "Hi, I'm your AI feedback assistant. I’ll be collecting your feedback on the generated output to help improve its quality. How would you rate the output from 1 to 5?"

def generate_heurisense_response(logs: list, image_base64: str = None) -> str:
    """Generate next conversation turn using HeuriSense master prompt."""
    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"
        
    prompt = f"""
{HEURISENSE_MASTER_PROMPT}

READ THE CHAT HISTORY BELOW.
Dynamically generate the next MOST APPROPRIATE message to the USER.
If the user provided an image, analyze it visually and refer to its contents naturally.

CHAT HISTORY:
{conversation_text}

Output ONLY your next message.
"""
    
    parts = [prompt]
    if image_base64:
        if "," in image_base64:
            format_str, data_str = image_base64.split(",", 1)
            mime_type = format_str.split(":")[1].split(";")[0]
            try:
                parts.append({"mime_type": mime_type, "data": base64.b64decode(data_str)})
            except:
                pass

    try:
        response = model.generate_content(parts)
        return response.text.strip()
    except Exception as e:
        print(f"LLM Chat Error: {e}")
        return "I encountered an error analyzing your request. Could you please specify your feedback again?"

class ExtractedFeedback(BaseModel):
    intended_goal: str
    overall_rating: int
    process_smoothness: str
    main_issue: str
    context_usage: str
    severity: str
    improvement_suggestions: str

def extract_session_data(logs: list) -> dict:
    """Runs at the end to parse unstructured chat into structured columns for CSV."""
    if not logs:
        return {}

    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"
        
    prompt = f"""
Analyze this structured interview transcript.
Extract the core values for these properties as concisely as possible (1-2 sentences max per field). 
If the user did not specify something, output "N/A".
Output strictly as JSON matching these keys:
- intended_goal
- overall_rating (number 1-5, or 0 if N/A)
- process_smoothness
- main_issue
- context_usage
- severity
- improvement_suggestions

Transcript:
{conversation_text}
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean json blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        import json
        return json.loads(text)
    except Exception as e:
        print(f"Extraction Error: {e}")
        return {}
