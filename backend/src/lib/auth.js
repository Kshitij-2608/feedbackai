import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
