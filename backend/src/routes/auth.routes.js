import { Router } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { comparePassword, hashPassword, signToken } from "../lib/auth.js";
import { HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const authRouter = Router();

authRouter.post(
  "/signup",
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.validated;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const token = signToken(user);
    res.status(201).json({ user, token });
  }),
);

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.validated;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);
