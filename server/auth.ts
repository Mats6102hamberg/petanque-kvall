import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  req.user = payload;
  next();
};
