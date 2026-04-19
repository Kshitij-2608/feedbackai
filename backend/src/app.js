import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        const allowed = [
          env.clientUrl,
          /^https:\/\/.*\.vercel\.app$/,
        ];
        const isAllowed = allowed.some((rule) =>
          typeof rule === "string" ? rule === origin : rule.test(origin)
        );
        callback(isAllowed ? null : new Error("CORS: origin not allowed"), isAllowed);
      },
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(uploadsDir));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
