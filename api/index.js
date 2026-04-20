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
  
  const appPath = path.resolve(process.cwd(), "backend/src/app.js");
  const { createApp } = await import(appPath);
  
  cachedApp = createApp();
  return cachedApp;
}

export default async function handler(req, res) {
  const url = req.url || "";
  console.log(`[Diagnostic] Method: ${req.method}, URL: ${url}`);

  // 1. Basic Health/Diagnostic Checks (broadest possible matching)
  if (url.toLowerCase().includes("diagnostic") || url.toLowerCase().includes("health")) {
    return res.status(200).json({
      status: "diagnostic-ok",
      received_url: url,
      method: req.method,
      cwd: process.cwd(),
      is_vercel: !!process.env.VERCEL,
      env_check: {
        db: !!process.env.DATABASE_URL
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
