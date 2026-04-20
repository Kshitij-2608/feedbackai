/**
 * api/index.js — Robust Vercel Serverless Function entry point.
 */

// Load env vars at the very beginning
import dotenv from "dotenv";
dotenv.config();

let cachedApp;

/**
 * Lazily loads and initializes the Express application.
 * This prevents top-level crashes and allows us to catch errors during the loading phase.
 */
async function getApp() {
  if (cachedApp) return cachedApp;
  
  // Dynamic import to catch errors in backend/src/app.js or its dependencies (like env.js)
  const { createApp } = await import("../backend/src/app.js");
  cachedApp = createApp();
  return cachedApp;
}

export default async function handler(req, res) {
  console.log(`[Request] ${req.method} ${req.url}`);

  // Basic health check that doesn't depend on the full app
  if (req.url && req.url.includes("/health/basic")) {
    return res.status(200).json({ status: "basic-ok", timestamp: new Date().toISOString() });
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error("[FATAL] Failed to initialize or run application:", err);
    
    // Return a readable error message to the client
    return res.status(500).json({
      error: "Initialization Failure",
      message: err.message,
      details: err.stack,
      hint: "Check Vercel environment variables and Prisma generation logs.",
    });
  }
}
