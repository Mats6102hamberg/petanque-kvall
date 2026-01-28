import type { Response, NextFunction, Request } from "express";
import { storage } from "../storage";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await storage.getUser(req.user.userId);

  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
