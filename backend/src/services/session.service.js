import prismaPackage from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { generateInterviewerReply, generateSessionSummary, analyzeUserTurn } from "./llm.provider.js";
import { HttpError } from "../lib/http-error.js";

const { SessionStatus } = prismaPackage;

export async function createInterviewSession({ submissionId, userId }) {
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
  });

  if (!submission) {
    throw new HttpError(404, "Submission not found");
  }

  const session = await prisma.interviewSession.create({
    data: {
      submissionId,
      userId,
      status: SessionStatus.ACTIVE,
      messages: {
        create: {
          role: "assistant",
          content: `Hello, and welcome. I’m here to gather feedback on "${submission.title}". To begin, what was your first impression of how well the generated output answered your original prompt?`,
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      submission: true,
    },
  });

  return session;
}

export async function addSessionMessage({ sessionId, userId, content }) {
  const session = await prisma.interviewSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: {
      submission: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      summary: true,
    },
  });

  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  if (session.status !== SessionStatus.ACTIVE) {
    throw new HttpError(400, "This session is already closed");
  }

  const currentStage = session.messages.length > 0
    ? (session.messages[session.messages.length - 1]?.sessionStage ?? "weaknesses")
    : "first_impression";

  const analysis = await analyzeUserTurn({
    message: content,
    submission: session.submission,
    recentContext: session.messages.slice(-4),
    sessionStage: currentStage,
  });

  const userMessage = await prisma.sessionMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content,
      sentimentLabel: analysis.sentimentLabel,
      offTopicFlag: Boolean(analysis.offTopic),
    },
  });

  const userQuestionCount = session.messages.filter((message) => message.role === "user").length + 1;
  const interviewer = await generateInterviewerReply({
    submission: session.submission,
    userMessage: content,
    analysis,
    questionNumber: userQuestionCount + 1,
    recentContext: session.messages.slice(-4),
    sessionStage: currentStage,
  });

  const assistantMessage = await prisma.sessionMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: interviewer.reply,
    },
  });

  const completionScore = Math.min(userQuestionCount * 25, 100);

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      completionScore,
      overallSentiment: analysis.sentimentLabel,
      continueSignalFinal: analysis.continueSignal,
    },
  });

  if (interviewer.shouldEnd || userQuestionCount >= 4) {
    const endedBy = interviewer.shouldEnd ? "USER" : "SYSTEM";
    const endReason = interviewer.shouldEnd ? "User indicated they wanted to stop" : "Structured interview completed";
    await endInterviewSession({ sessionId: session.id, userId, endedBy, endReason });
  }

  const refreshed = await prisma.interviewSession.findUnique({
    where: { id: session.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      summary: true,
    },
  });

  return {
    session: refreshed,
    latestMessages: [userMessage, assistantMessage],
  };
}

export async function endInterviewSession({ sessionId, userId, endedBy = "USER", endReason = "Session ended manually" }) {
  const session = await prisma.interviewSession.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    include: {
      submission: true,
      messages: {
        orderBy: { createdAt: "asc" },
      },
      summary: true,
    },
  });

  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  if (session.summary) {
    return session.summary;
  }

  const summaryPayload = await generateSessionSummary({
    submission: session.submission,
    messages: session.messages,
  });

  const status = endedBy === "SYSTEM" ? SessionStatus.COMPLETED : SessionStatus.ENDED_EARLY;

  const result = await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        status,
        endedAt: new Date(),
        endedBy,
        endReason,
        overallSentiment: summaryPayload.overallSentiment,
        continueSignalFinal: summaryPayload.continueSignalFinal,
      },
    });

    const summary = await tx.sessionSummary.create({
      data: {
        sessionId: session.id,
        shortSummary: summaryPayload.shortSummary,
        strengths: summaryPayload.strengths,
        weaknesses: summaryPayload.weaknesses,
        recommendations: summaryPayload.recommendations,
        sentimentTimeline: summaryPayload.sentimentTimeline,
        engagementLevel: summaryPayload.engagementLevel,
        summaryConfidence: summaryPayload.summaryConfidence,
      },
    });

    await tx.sessionMessage.deleteMany({
      where: {
        sessionId: session.id,
      },
    });

    return summary;
  });

  return result;
}
