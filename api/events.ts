import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // GET /api/events?type=upcoming
  if (req.query.type === "upcoming") {
    try {
      const event = await storage.getUpcomingEvent();
      if (!event) return res.json(null);

      const registrationCount = await storage.getRegistrationCount(event.id);
      return res.json({ ...event, registrationCount });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta event" });
    }
  }

  // GET /api/events?type=with-matches
  if (req.query.type === "with-matches") {
    try {
      const events = await storage.getAllEvents();
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const matches = await storage.getMatchesByEvent(event.id);

          const matchesWithDetails = await Promise.all(
            matches.map(async (match) => {
              const team1Members = await storage.getTeamMembers(match.team1Id);
              const team2Members = await storage.getTeamMembers(match.team2Id);
              const allTeams = await storage.getTeamsByEvent(event.id);
              return {
                ...match,
                team1: { ...allTeams.find((t) => t.id === match.team1Id)!, members: team1Members },
                team2: { ...allTeams.find((t) => t.id === match.team2Id)!, members: team2Members },
              };
            })
          );

          return { ...event, matches: matchesWithDetails };
        })
      );
      return res.json(eventsWithDetails);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta events" });
    }
  }

  // GET /api/events - list all events
  try {
    const events = await storage.getAllEvents();
    return res.json(events);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Kunde inte hämta events" });
  }
}
