import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(12, "JWT_SECRET must be at least 12 characters"),
  OPENAI_API_KEY: z.string().optional(),
  LLM_API_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_PROVIDER_MODE: z.enum(["mock", "api", "ml"]).default("mock"),
  ML_MODEL_URL: z.string().url().optional(),
  DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  clientUrl: parsed.data.CLIENT_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  openAiApiKey: parsed.data.OPENAI_API_KEY,
  llmApiUrl: parsed.data.LLM_API_URL,
  llmApiKey: parsed.data.LLM_API_KEY,
  llmModel: parsed.data.LLM_MODEL,
  llmProviderMode: parsed.data.LLM_PROVIDER_MODE,
  mlModelUrl: parsed.data.ML_MODEL_URL,
};
