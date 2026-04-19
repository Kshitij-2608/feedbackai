import { Router } from "express";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const summaryRouter = Router();

summaryRouter.use(requireAuth);

summaryRouter.get(
  "/:sessionId",
  asyncHandler(async (req, res) => {
    const where = req.user.role === "ADMIN"
      ? { sessionId: req.params.sessionId }
      : {
          sessionId: req.params.sessionId,
          session: {
            is: {
              userId: req.user.id,
            },
          },
        };

    const summary = await prisma.sessionSummary.findFirst({
      where,
      include: {
        session: {
          include: {
            submission: true,
          },
        },
      },
    });

    if (!summary) {
      throw new HttpError(404, "Summary not found");
    }

    res.json({ summary });
  }),
);
