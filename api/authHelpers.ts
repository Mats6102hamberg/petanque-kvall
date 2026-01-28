import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const SALT_ROUNDS = 10;

export interface JWTPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
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

export function getAuthUser(req: VercelRequest): JWTPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifyToken(token);
}

export function requireAuth(
  handler: (req: VercelRequest, res: VercelResponse, user: JWTPayload) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return handler(req, res, user);
  };
}
