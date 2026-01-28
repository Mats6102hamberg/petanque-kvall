import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./storage";
import { hashPassword, verifyPassword, generateToken, getAuthUser } from "./authHelpers";
import { registerSchema, loginSchema } from "./schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split("?")[0] || "";

  // POST /api/auth?action=register
  if (req.method === "POST" && req.query.action === "register") {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0]?.message || "Ogiltig data" });
      }

      const { email, password, firstName, lastName } = result.data;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "E-postadressen används redan" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, passwordHash, firstName, lastName });
      const token = generateToken({ userId: user.id, email: user.email });

      return res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, status: user.status },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Kunde inte registrera användare" });
    }
  }

  // POST /api/auth?action=login
  if (req.method === "POST" && req.query.action === "login") {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0]?.message || "Ogiltig data" });
      }

      const { email, password } = result.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Fel e-post eller lösenord" });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Fel e-post eller lösenord" });
      }

      const token = generateToken({ userId: user.id, email: user.email });
      return res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, status: user.status },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Kunde inte logga in" });
    }
  }

  // GET /api/auth?action=user
  if (req.method === "GET" && req.query.action === "user") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(authUser.userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }
      return res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isAdmin: user.isAdmin, status: user.status });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta användare" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
