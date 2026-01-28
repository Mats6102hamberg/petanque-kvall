import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_storage";
import { verifyPassword, generateToken } from "../_auth";
import { loginSchema } from "../../shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

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

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Kunde inte logga in" });
  }
}
