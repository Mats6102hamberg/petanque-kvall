import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../_storage";
import { getAuthUser } from "../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(authUser.userId);
    if (!user) {
      return res.status(404).json({ message: "Användare hittades inte" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      status: user.status,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Kunde inte hämta användare" });
  }
}
