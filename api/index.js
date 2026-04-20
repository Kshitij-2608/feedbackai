/**
 * api/index.js — Vercel Serverless Function entry point.
 * Static import so Vercel's bundler can trace the module graph.
 */

// IMPORTANT: load env vars first before any other module executes
import dotenv from "dotenv";
dotenv.config();

import { createApp } from "../backend/src/app.js";

let app;
let initError;

try {
  app = createApp();
} catch (err) {
  initError = err;
  console.error("[FATAL] App failed to initialize:", err);
}

// Default export: if init failed, return 500 with real error so we can debug
export default function handler(req, res) {
  if (initError) {
    return res.status(500).json({
      error: "App failed to initialize",
      message: initError.message,
      stack: process.env.NODE_ENV !== "production" ? initError.stack : undefined,
    });
  }
  return app(req, res);
}
