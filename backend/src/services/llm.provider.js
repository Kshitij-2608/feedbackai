import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

// ---------------------------------------------------------------------------
// ML inference server helpers
// ---------------------------------------------------------------------------

async function callMlServer(endpoint, body) {
  if (!env.mlModelUrl) {
    throw new Error("ML_MODEL_URL is not configured");
  }
  const response = await fetch(`${env.mlModelUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ML server error ${response.status}: ${text}`);
  }
  return response.json();
}

// Maps policy model output to a question the interviewer should ask.
const POLICY_QUESTION_MAP = {
  greet_opening: (submission) =>
    `Hello, and welcome. I'm here to gather feedback on "${submission.title}". What was your first impression of the generated output?`,
  ask_first_impression: () =>
    "What was your first impression of how well the generated output answered your original prompt?",
  probe_strength: () =>
    "What part of the generated output felt strongest or most useful?",
  probe_weakness: () =>
    "Where did the generated output fall short of your expectations?",
  probe_specific_issue: () =>
    "Could you describe that issue in more detail? What specifically went wrong?",
  ask_improvement_priority: () =>
    "If you could improve one thing in this output, what would you change first?",
  redirect_to_feedback: () =>
    "I'd like to keep our focus on the generated output. Could you share what you thought of how well it matched your prompt?",
  shorten_question: () =>
    "To keep this brief — what is the single most important issue you noticed?",
  empathy_then_probe: () =>
    "I understand that's frustrating. To improve the model, could you describe the specific issue that bothered you most?",
  confirm_end: () =>
    "It sounds like you'd prefer to stop here. Shall I close the session and prepare a summary?",
  wrap_up: () =>
    "Thank you for your feedback. I'll now generate a summary of this session.",
};


function jsonResponse(content) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Model response did not include JSON");
  }

  return JSON.parse(content.slice(start, end + 1));
}

async function callApiModel(systemPrompt, userPrompt) {
  if (!env.llmApiUrl || !env.llmApiKey || !env.llmModel) {
    throw new HttpError(500, "LLM provider is set to api mode but LLM_API_URL, LLM_API_KEY, or LLM_MODEL is missing");
  }

  const response = await fetch(env.llmApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.llmApiKey}`,
    },
    body: JSON.stringify({
      model: env.llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(502, "LLM provider request failed", text);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new HttpError(502, "LLM provider returned an unexpected payload");
  }

  return jsonResponse(content);
}

function analyzeIntentLocally(userMessage) {
  const message = userMessage.toLowerCase();
  const stopPatterns = ["stop", "end", "done", "enough", "quit", "wrap up"];
  const hesitantPatterns = ["not sure", "maybe later", "short", "tired", "busy"];
  const frustratedPatterns = ["annoyed", "frustrated", "bad", "upset", "hate", "waste"];
  const offTopicPatterns = ["weather", "movie", "sports", "recipe", "joke"];

  if (stopPatterns.some((pattern) => message.includes(pattern))) {
    return { sentimentLabel: "wants_to_stop", continueSignal: "stop", offTopic: false };
  }

  if (frustratedPatterns.some((pattern) => message.includes(pattern))) {
    return { sentimentLabel: "frustrated", continueSignal: "uncertain", offTopic: false };
  }

  if (hesitantPatterns.some((pattern) => message.includes(pattern))) {
    return { sentimentLabel: "hesitant", continueSignal: "uncertain", offTopic: false };
  }

  if (offTopicPatterns.some((pattern) => message.includes(pattern))) {
    return { sentimentLabel: "neutral", continueSignal: "continue", offTopic: true };
  }

  return { sentimentLabel: "engaged", continueSignal: "continue", offTopic: false };
}

function buildQuestion(submission, userMessage, analysis, questionNumber) {
  const contextLead = questionNumber === 1
    ? `Hello, and thank you for taking the time to share feedback on "${submission.title}".`
    : "Thank you for that feedback.";

  if (analysis.continueSignal === "stop") {
    return {
      reply: `${contextLead} I appreciate your time. It sounds like you'd prefer to stop here, which is completely fine. I'll close the session and prepare a summary of the feedback you've shared so far.`,
      shouldEnd: true,
    };
  }

  if (analysis.offTopic) {
    return {
      reply: `${contextLead} I’d like to keep us focused on feedback for the submitted content. Could you share how the generated output matched, or failed to match, the prompt you originally gave?`,
      shouldEnd: false,
    };
  }

  if (analysis.sentimentLabel === "frustrated") {
    return {
      reply: `${contextLead} I’m sorry the experience felt frustrating. To keep this easy, could you tell me the single biggest issue you noticed in the generated output compared with your prompt?`,
      shouldEnd: false,
    };
  }

  if (analysis.sentimentLabel === "hesitant") {
    return {
      reply: `${contextLead} I’ll keep it brief. What is one improvement that would make this generated output more useful for your use case?`,
      shouldEnd: false,
    };
  }

  const prompts = [
    `What part of the generated output felt strongest compared with your original prompt?`,
    `Where did the generated output fall short of what you expected from the prompt?`,
    `If you could improve one thing in this output, what would you change first?`,
    `How well did the output fit the intended ${submission.inputType} use case?`,
  ];

  const followUp = questionNumber === 1
    ? `Hello, and thank you for taking the time to share feedback on "${submission.title}". I’m here to collect focused feedback on your submitted content. To begin, what was your first impression of how well the generated output answered your original prompt?`
    : `Thank you for that feedback. ${prompts[(questionNumber - 2) % prompts.length]}`;

  return { reply: followUp, shouldEnd: false };
}

function buildSummary(submission, messages) {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  const sentiments = userMessages.map((message) => message.sentimentLabel).filter(Boolean);

  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";
  const combinedFeedback = userMessages.map((message) => message.content).join(" ");
  const lowercase = combinedFeedback.toLowerCase();

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (/(good|great|strong|helpful|clear|coherent|accurate)/.test(lowercase)) {
    strengths.push("User highlighted positive aspects in the generated output, especially around quality or usefulness.");
  } else {
    strengths.push("Session did not surface a major strength with high confidence.");
  }

  if (/(bad|weak|wrong|halluc|unclear|inaccurate|missed|slow)/.test(lowercase)) {
    weaknesses.push("User identified quality gaps or mismatches between the prompt and generated output.");
  } else {
    weaknesses.push("No critical weakness was stated explicitly, though additional probing may help in later sessions.");
  }

  if (/(improve|better|change|fix|should|need)/.test(lowercase) || lastUserMessage) {
    recommendations.push("Prioritize the improvement request most clearly expressed by the user during the session.");
  } else {
    recommendations.push("Collect one more direct improvement suggestion in future sessions for better actionability.");
  }

  return {
    shortSummary: `Feedback session for "${submission.title}" captured focused user impressions about how the generated output aligned with the original prompt. ${userMessages.length} user response(s) were collected and summarized for admin review.`,
    strengths,
    weaknesses,
    recommendations,
    sentimentTimeline: userMessages.map((message, index) => ({
      step: index + 1,
      sentiment: message.sentimentLabel || "neutral",
    })),
    engagementLevel: sentiments.includes("wants_to_stop") ? "low" : sentiments.includes("hesitant") ? "medium" : "high",
    summaryConfidence: assistantMessages.length > 0 && userMessages.length > 0 ? "medium" : "low",
    overallSentiment: sentiments.at(-1) || "neutral",
    continueSignalFinal: sentiments.includes("wants_to_stop") ? "stop" : "continue",
  };
}

export async function analyzeUserTurn({ message, submission, recentContext, sessionStage }) {
  // ML inference server mode
  if (env.llmProviderMode === "ml") {
    try {
      const result = await callMlServer("/analyze-turn", {
        input_type: submission?.inputType ?? "text",
        source_model_label: submission?.sourceModelLabel ?? "unknown",
        session_stage: sessionStage ?? "weaknesses",
        original_prompt: submission?.originalPrompt ?? "",
        generated_content: submission?.generatedContent ?? "",
        recent_context: (recentContext ?? []).map((m) => ({ role: m.role, text: m.content })),
        latest_user_message: message,
      });
      return {
        sentimentLabel: result.sentiment,
        continueSignal: result.continue_signal,
        offTopic: result.topic === "off_topic",
        themes: result.themes,
        feedbackQuality: result.feedback_quality,
      };
    } catch (err) {
      console.warn("[llm.provider] ML server unreachable, falling back to mock:", err.message);
      return analyzeIntentLocally(message);
    }
  }

  // External LLM API mode
  if (env.llmProviderMode === "api") {
    return callApiModel(
      "You classify user engagement in a feedback interview. Return JSON with sentimentLabel, continueSignal, and offTopic.",
      `Classify this user reply in a feedback interview: ${message}`,
    );
  }

  // Default: local mock
  return analyzeIntentLocally(message);
}

export async function generateInterviewerReply({ submission, userMessage, analysis, questionNumber, recentContext, sessionStage }) {
  // ML inference server mode
  if (env.llmProviderMode === "ml") {
    try {
      const signals = {
        sentiment: analysis.sentimentLabel ?? "neutral",
        topic: analysis.offTopic ? "off_topic" : "on_topic",
        continue_signal: analysis.continueSignal ?? "continue",
        themes: analysis.themes ?? ["other"],
        feedback_quality: analysis.feedbackQuality ?? "somewhat_actionable",
      };
      const result = await callMlServer("/select-policy", {
        session_stage: sessionStage ?? "weaknesses",
        recent_context: (recentContext ?? []).map((m) => ({ role: m.role, text: m.content })),
        model_signals: signals,
      });
      const policy = result.policy ?? "probe_weakness";
      const questionFn = POLICY_QUESTION_MAP[policy] ?? POLICY_QUESTION_MAP["probe_weakness"];
      const shouldEnd = policy === "wrap_up" || analysis.continueSignal === "stop";
      return { reply: questionFn(submission), shouldEnd };
    } catch (err) {
      console.warn("[llm.provider] ML server unreachable, falling back to mock:", err.message);
      return buildQuestion(submission, userMessage, analysis, questionNumber);
    }
  }

  // External LLM API mode
  if (env.llmProviderMode === "api") {
    return callApiModel(
      "You are a polite feedback interviewer. Greet the user, stay focused on feedback, redirect off-topic politely, and return JSON with reply and shouldEnd.",
      JSON.stringify({ submission, userMessage, analysis, questionNumber }),
    );
  }

  // Default: local mock
  return buildQuestion(submission, userMessage, analysis, questionNumber);
}

export async function generateSessionSummary({ submission, messages }) {
  if (env.llmProviderMode === "api") {
    return callApiModel(
      "You summarize a feedback interview. Return JSON with shortSummary, strengths, weaknesses, recommendations, sentimentTimeline, engagementLevel, summaryConfidence, overallSentiment, continueSignalFinal.",
      JSON.stringify({ submission, messages }),
    );
  }

  return buildSummary(submission, messages);
}
