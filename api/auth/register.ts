import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_storage";
import { hashPassword, generateToken } from "../_auth";
import { registerSchema } from "../../shared/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

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
    console.error("Registration error:", error);
    res.status(500).json({ message: "Kunde inte registrera användare" });
  }
}
