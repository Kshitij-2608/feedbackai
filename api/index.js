/**
 * api/index.js — Clean Production Vercel Entry Point.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config();

let cachedApp;

async function getApp() {
  if (cachedApp) return cachedApp;
  
  // Resolve app.js path relative to the runtime root
  const appPath = path.resolve(process.cwd(), "backend/src/app.js");
  const { createApp } = await import(appPath);
  
  cachedApp = createApp();
  return cachedApp;
}

/**
 * Vercel Serverless Function handler.
 * Wraps the Express app and handles lazy initialization to manage cold starts and errors.
 */
export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error("[FATAL] Production Initialization Error:", err);
    return res.status(500).json({
      error: "Service Temporarily Unavailable",
      message: process.env.NODE_ENV === "development" ? err.message : "The server failed to start. Please check the logs.",
    });
  }
}
