import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

type JwtPayload = {
  sub: string;
  email: string;
  name: string;
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(new AppError("Authentication required", 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    // Re-read the user on every request so deleted accounts cannot keep using an old JWT.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return next(new AppError("User no longer exists", 401));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};
