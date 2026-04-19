import { Router } from "express";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const noteSchema = z.object({
  note: z.string().min(1).max(5000),
});

const exportQuerySchema = z.object({
  inputType: z.string().optional(),
  sourceModelLabel: z.string().optional(),
  status: z.string().optional(),
  sentiment: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

function parseFilters(query) {
  const result = exportQuerySchema.safeParse(query);

  if (!result.success) {
    throw new HttpError(400, "Invalid admin filters", result.error.flatten());
  }

  return {
    ...result.data,
    status: result.data.status?.toUpperCase(),
  };
}

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const filters = parseFilters(req.query);
    const sessions = await prisma.interviewSession.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sentiment ? { overallSentiment: filters.sentiment } : {}),
        submission: {
          ...(filters.inputType ? { inputType: filters.inputType } : {}),
          ...(filters.sourceModelLabel ? { sourceModelLabel: filters.sourceModelLabel } : {}),
        },
      },
      include: {
        submission: true,
        summary: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        adminNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({ sessions });
  }),
);

adminRouter.get(
  "/sessions/:sessionId",
  asyncHandler(async (req, res) => {
    const session = await prisma.interviewSession.findUnique({
      where: { id: req.params.sessionId },
      include: {
        submission: true,
        summary: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        adminNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new HttpError(404, "Session not found");
    }

    res.json({ session });
  }),
);

adminRouter.post(
  "/sessions/:sessionId/notes",
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.interviewSession.findUnique({
      where: { id: req.params.sessionId },
      select: { id: true },
    });

    if (!existing) {
      throw new HttpError(404, "Session not found");
    }

    const note = await prisma.adminNote.create({
      data: {
        sessionId: req.params.sessionId,
        adminId: req.user.id,
        note: req.validated.note,
      },
    });

    res.status(201).json({ note });
  }),
);

adminRouter.get(
  "/exports/summaries",
  asyncHandler(async (req, res) => {
    const filters = parseFilters(req.query);
    const sessions = await prisma.interviewSession.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sentiment ? { overallSentiment: filters.sentiment } : {}),
        summary: { isNot: null },
        submission: {
          ...(filters.inputType ? { inputType: filters.inputType } : {}),
          ...(filters.sourceModelLabel ? { sourceModelLabel: filters.sourceModelLabel } : {}),
        },
      },
      include: {
        summary: true,
        submission: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const exportRows = sessions.map((session) => ({
      sessionId: session.id,
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      submissionTitle: session.submission.title,
      inputType: session.submission.inputType,
      sourceModelLabel: session.submission.sourceModelLabel,
      status: session.status,
      overallSentiment: session.overallSentiment,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || "",
      shortSummary: session.summary?.shortSummary || "",
      strengths: JSON.stringify(session.summary?.strengths || []),
      weaknesses: JSON.stringify(session.summary?.weaknesses || []),
      recommendations: JSON.stringify(session.summary?.recommendations || []),
      engagementLevel: session.summary?.engagementLevel || "",
      summaryConfidence: session.summary?.summaryConfidence || "",
    }));

    if (filters.format === "csv") {
      const csv = stringify(exportRows, {
        header: true,
      });
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="session-summaries.csv"');
      return res.send(csv);
    }

    res.json({ exports: exportRows });
  }),
);
