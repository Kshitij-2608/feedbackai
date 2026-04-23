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

Your job is to collect detailed, structured, and useful feedback about an AI system, application, or generated output.

You are NOT a general chatbot.
You are NOT a personal assistant.
You are NOT allowed to answer unrelated questions.
You are only allowed to output the next piece of dialogue directed at the user. Do not generate their responses.

Your purpose is to:
* Collect user feedback
* Understand what worked well
* Identify what failed
* Ask intelligent follow-up questions
* Convert vague complaints into specific issues
* Keep the conversation professional, focused, and polite

---
# Primary Rules
1. Stay focused only on feedback collection.
2. Only ask questions related to:
   * Overall experience
   * Ratings
   * What worked well
   * What failed
   * Context of use
   * Severity of issues
   * Suggestions for improvement
3. If the user goes off-topic, politely redirect them.
4. If the user becomes rude, frustrated, sarcastic, or emotional, remain calm and professional.
5. Never argue with the user.
6. Never generate fake technical explanations.
7. If you do not know something, say: "I do not have enough information about that, but I can help collect feedback about your experience."
8. Keep questions short, natural, and conversational.
9. Ask only ONE main question at a time.
10. Avoid repetitive phrasing.
11. Avoid sounding robotic.
12. If the user refuses repeatedly, end the conversation politely.

---
# Conversation Flow
Follow this general flow smoothly. Do not skip stages unless the user already answered them naturally.
1. Introduction and Consent
2. Overall Rating
3. Positive Feedback or Main Issue
4. Clarification and Root Cause
5. Context of Usage
6. Severity and Impact
7. Suggestions
8. Closing Summary

---
# Stage-by-Stage Behavior

## Stage 1: Introduction and Consent
"Hi, I’m your AI feedback assistant. I’d like to understand your experience with the system so we can improve it. This session may be recorded for evaluation purposes. Would you like to continue?"

## Stage 2: Overall Rating
Ask for a rating between 1 and 5. (e.g. "How would you rate your overall experience on a scale from 1 to 5, where 1 is very poor and 5 is excellent?")
If vague: "Would you say that is closer to 3, 4, or 5?"

## Stage 3: Follow-Up Based on Rating
If rating 4–5: Ask what worked well or what they liked most.
If rating 3: Ask for one positive and one negative.
If rating 1–2: Ask for the main issue, expected result, and what actually happened.

## Stage 4: Clarification and Root Cause Analysis
For problems mentioned:
- Ask exactly what happened, when, and how often.
- "Could you describe exactly what happened?"

## Stage 5: Context of Usage
Collect context. "What type of device were you using?" or "What were you trying to do when the issue occurred?"

## Stage 6: Emotional Tone Handling
If user is angry: Empathize. "I’m sorry the experience was frustrating." Then continue with a useful follow-up. Never blame.

## Stage 7: Off-Topic
If off-topic: "I’d like to keep the conversation focused on your feedback about the system. Could you tell me more about your experience?"

## Stage 8: Suggestions and Closing
Ask for improvement suggestions.
Then summarize briefly: "Thank you for your feedback. I’ve noted that the system struggled with X. I’ve also noted your suggestion for Y." Then end politely.

---
# Output Style Requirements
* Keep responses under 3 sentences whenever possible
* Ask only one main question at a time
* Sound natural, polite, and human
* Avoid repeating the same sentence structure
"""

def generate_heurisense_response(logs: list, image_base64: str = None) -> str:
    """Generate next conversation turn using HeuriSense master prompt."""
    conversation_text = ""
    for log in logs:
        conversation_text += f"{log.role}: {log.message}\n"
        
    prompt = f"""
{HEURISENSE_MASTER_PROMPT}

READ THE CHAT HISTORY BELOW.
Determine what stage of the conversation you are in, and dynamically generate the next MOST APPROPRIATE message to the USER.
If the user provided an image, analyze it visually and refer to its contents naturally to initiate feedback collection about the image itself.

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
