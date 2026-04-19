import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { addSessionMessage, createInterviewSession, endInterviewSession } from "../services/session.service.js";

const createSessionSchema = z.object({
  submissionId: z.string().min(1),
});

const messageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const endSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const sessionRouter = Router();

sessionRouter.use(requireAuth);

sessionRouter.post(
  "/",
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await createInterviewSession({
      submissionId: req.validated.submissionId,
      userId: req.user.id,
    });

    res.status(201).json({ session });
  }),
);

sessionRouter.get(
  "/:sessionId",
  asyncHandler(async (req, res) => {
    const where = req.user.role === "ADMIN"
      ? { id: req.params.sessionId }
      : { id: req.params.sessionId, userId: req.user.id };

    const session = await prisma.interviewSession.findFirst({
      where,
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

    res.json({ session });
  }),
);

sessionRouter.post(
  "/:sessionId/message",
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const result = await addSessionMessage({
      sessionId: req.params.sessionId,
      userId: req.user.id,
      content: req.validated.content,
    });

    res.json(result);
  }),
);

sessionRouter.post(
  "/:sessionId/end",
  validate(endSchema),
  asyncHandler(async (req, res) => {
    const summary = await endInterviewSession({
      sessionId: req.params.sessionId,
      userId: req.user.id,
      endedBy: "USER",
      endReason: req.validated.reason || "Session ended by the user",
    });

    res.json({ summary });
  }),
);
