import { prisma } from "../config/prisma.js";
import { verifyToken } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";

function getBearerToken(header = "") {
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

export async function requireAuth(req, _res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (!user) {
      return next(new HttpError(401, "User not found"));
    }

    req.user = user;
    next();
  } catch (_error) {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission for this action"));
    }

    next();
  };
}
