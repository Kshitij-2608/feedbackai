/**
 * api/index.js — Vercel Serverless Function entry point.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config();

let cachedApp;

async function getApp() {
  if (cachedApp) return cachedApp;
  console.log("[Init] Importing app.js from backend/src...");
  
  // Use a more robust way to resolve the path in serverless
  const appPath = path.resolve(process.cwd(), "backend/src/app.js");
  const { createApp } = await import(appPath);
  
  cachedApp = createApp();
  return cachedApp;
}

export default async function handler(req, res) {
  console.log(`[Diagnostic] Method: ${req.method}, URL: ${req.url}`);

  // 1. Basic Health/Diagnostic Checks (broad matching)
  if (req.url.includes("diagnostic") || req.url.includes("health/basic")) {
    return res.status(200).json({
      status: "diagnostic-ok",
      received_url: req.url,
      method: req.method,
      cwd: process.cwd(),
      env_check: {
        db: !!process.env.DATABASE_URL,
        vercel: !!process.env.VERCEL
      }
    });
  }

  try {
    const app = await getApp();
    // 2. Pass request to Express
    return app(req, res);
  } catch (err) {
    console.error("[FATAL] Error in serverless handler:", err);
    return res.status(500).json({
      error: "Serverless Execution Error",
      message: err.message,
      stack: err.stack,
      hint: "Check environment variables and Prisma generation logs."
    });
  }
}
