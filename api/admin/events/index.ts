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

  if (req.method === "GET") {
    try {
      const events = await storage.getAllEvents();
      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const registrationCount = await storage.getRegistrationCount(event.id);
          const matches = await storage.getMatchesByEvent(event.id);
          return { ...event, registrationCount, matchCount: matches.length };
        })
      );
      return res.json(eventsWithCounts);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta events" });
    }
  }

  if (req.method === "POST") {
    try {
      const event = await storage.createGameEvent(req.body);
      return res.json(event);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte skapa event" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
