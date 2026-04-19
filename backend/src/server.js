import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`FeedbackAI backend listening on port ${env.port}`);
  // Warm the Neon DB connection on startup (free tier suspends after inactivity)
  prisma.$connect().catch((err) =>
    console.warn("[DB] Warm-up connection failed (Neon may be waking):", err.message)
  );
});
