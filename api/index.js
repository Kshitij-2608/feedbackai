/**
 * api/index.js — Vercel Serverless Function entry point.
 *
 * Routes: all /api/* traffic is rewritten here by vercel.json.
 * The Express app is imported from backend/src and exported as the default
 * handler that Vercel wraps in its serverless runtime.
 *
 * ML Inference Server note:
 * The inference server (FastAPI/Python) cannot run on Vercel.
 * When LLM_PROVIDER_MODE=api the backend uses Gemini directly.
 * Set ML_MODEL_URL in env vars only if you have a separate hosted ML server.
 */

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the Express app factory from the backend source
// Using explicit path resolution so Vercel can trace the module graph
const { createApp } = await import(
  new URL("../backend/src/app.js", import.meta.url).href
);

const app = createApp();

// Vercel expects the default export to be the request handler
export default app;
