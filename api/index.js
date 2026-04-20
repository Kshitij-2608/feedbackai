/**
 * api/index.js — Vercel Serverless Function entry point.
 *
 * All /api/* traffic is rewritten here by vercel.json.
 * Uses a static import (not dynamic) so Vercel's bundler can trace the module graph.
 *
 * ML note: The FastAPI inference server cannot run on Vercel.
 * Set LLM_PROVIDER_MODE=api in Vercel env vars to use Gemini directly.
 */

// Load environment variables FIRST before any other module runs
import dotenv from "dotenv";
dotenv.config();

import { createApp } from "../backend/src/app.js";

const app = createApp();

// Vercel expects the default export to be the request handler
export default app;
