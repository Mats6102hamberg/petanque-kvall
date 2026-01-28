import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../_storage";
import { getAuthUser } from "../../../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const adminUser = await storage.getUser(authUser.userId);
  if (!adminUser?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { id } = req.query;
  const userId = id as string;
  const { status } = req.body;

  if (!["pending", "approved", "inactive"].includes(status)) {
    return res.status(400).json({ message: "Ogiltig status" });
  }

  try {
    const user = await storage.updateUserStatus(userId, status);
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      status: user.status,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Kunde inte uppdatera status" });
  }
}
