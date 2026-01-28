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
    const stats = await storage.getUserStats(authUser.userId);
    res.json(stats);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Kunde inte hämta statistik" });
  }
}
