/**
 * prisma.js — Standard Prisma client configured for Neon PostgreSQL.
 *
 * Uses standard TCP connection with retry logic to handle Neon free-tier
 * compute auto-suspension (compute suspends after ~5min of inactivity and
 * takes up to 10-15s to wake on first connection).
 *
 * The DATABASE_URL must include connect_timeout=20 to tolerate cold starts.
 */

import prismaPackage from "@prisma/client";

const { PrismaClient } = prismaPackage;

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

/**
 * Runs a Prisma operation with automatic retry on connection failure.
 * Neon free tier may need 1-2 retries while compute wakes up.
 */
export async function withRetry(fn, retries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError =
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes("Connection refused") ||
        err?.code === "P1001" ||
        err?.code === "P1008";

      if (isConnectionError && attempt < retries) {
        console.warn(
          `[DB] Connection attempt ${attempt} failed (Neon cold start?). Retrying in ${delayMs}ms...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
}
