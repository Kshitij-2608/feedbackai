/**
 * api/index.js — Vercel Serverless Function entry point.
 */

import dotenv from "dotenv";
dotenv.config();

let cachedApp;

async function getApp() {
  if (cachedApp) return cachedApp;
  console.log("[Init] Importing app.js...");
  const { createApp } = await import("../backend/src/app.js");
  cachedApp = createApp();
  return cachedApp;
}

export default async function handler(req, res) {
  // Log EVERYTHING to Vercel logs
  console.log(`[Diagnostic] Method: ${req.method}, URL: ${req.url}`);

  // Absolute most basic response
  if (req.url.includes("diagnostic")) {
    return res.status(200).json({
      status: "diagnostic-ok",
      url: req.url,
      method: req.method,
      cwd: process.cwd()
    });
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error("[FATAL] Error in serverless handler:", err);
    return res.status(500).json({
      error: "Serverless Initialization Error",
      message: err.message,
      stack: err.stack,
      env_check: {
        db: !!process.env.DATABASE_URL,
        jwt: !!process.env.JWT_SECRET
      }
    });
  }
}
