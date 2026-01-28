import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../_storage";
import { getAuthUser } from "../../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(authUser.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { id } = req.query;
  const eventId = parseInt(id as string);

  if (req.method === "DELETE") {
    try {
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event hittades inte" });
      }
      await storage.deleteEvent(eventId);
      return res.json({ message: "Event borttaget" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte ta bort event" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
