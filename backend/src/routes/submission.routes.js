import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { upload } from "../lib/upload.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { HttpError } from "../lib/http-error.js";

const submissionSchema = z.object({
  title: z.string().min(2).max(200),
  originalPrompt: z.string().min(10),
  generatedContent: z.string().min(10),
  inputType: z.string().min(2).max(50),
  sourceModelLabel: z.string().min(2).max(100),
});

export const submissionRouter = Router();

submissionRouter.use(requireAuth);

submissionRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const parsed = submissionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, "Validation failed", parsed.error.flatten());
    }

    const file = req.file;
    const submission = await prisma.submission.create({
      data: {
        userId: req.user.id,
        title: parsed.data.title,
        originalPrompt: parsed.data.originalPrompt,
        generatedContent: parsed.data.generatedContent,
        inputType: parsed.data.inputType,
        sourceModelLabel: parsed.data.sourceModelLabel,
        uploadedFileUrl: file ? `/uploads/${file.filename}` : null,
        uploadedFileName: file?.originalname,
        uploadedFileType: file?.mimetype,
      },
    });

    res.status(201).json({ submission });
  }),
);

submissionRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ submissions });
  }),
);

submissionRouter.get(
  "/:submissionId",
  asyncHandler(async (req, res) => {
    const where = req.user.role === "ADMIN"
      ? { id: req.params.submissionId }
      : { id: req.params.submissionId, userId: req.user.id };

    const submission = await prisma.submission.findFirst({ where });
    if (!submission) {
      throw new HttpError(404, "Submission not found");
    }

    res.json({ submission });
  }),
);
