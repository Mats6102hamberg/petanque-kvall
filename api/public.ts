import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for public endpoints
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const action = req.query.action as string;
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;

  // GET /api/public?eventId=X - Get event with matches for live scoreboard
  if (eventId && !action) {
    try {
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event hittades inte" });
      }

      const matches = await storage.getMatchesByEvent(eventId);
      const teams = await storage.getTeamsByEvent(eventId);

      // Get team members for each team
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const members = await storage.getTeamMembers(team.id);
          return { ...team, members };
        })
      );

      // Enrich matches with team info
      const enrichedMatches = matches.map((match) => ({
        ...match,
        team1: teamsWithMembers.find((t) => t.id === match.team1Id),
        team2: teamsWithMembers.find((t) => t.id === match.team2Id),
      }));

      return res.json({
        ...event,
        matches: enrichedMatches,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta event" });
    }
  }

  // GET /api/public?action=verify&eventId=X&userId=Y - Verify user registration
  if (action === "verify" && eventId) {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "userId krävs" });
      }

      const registration = await storage.getUserRegistrationForEvent(userId, eventId);
      if (!registration) {
        return res.json({ registered: false });
      }

      const event = await storage.getEventById(eventId);
      const user = await storage.getUser(userId);

      return res.json({
        registered: true,
        registration: {
          id: registration.id,
          checkedInAt: registration.checkedInAt || null,
        },
        event: event ? {
          id: event.id,
          eventDate: event.eventDate,
          eventType: event.eventType,
          location: event.location,
          startTime: event.startTime,
        } : null,
        user: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte verifiera" });
    }
  }

  // GET /api/public?action=upcoming - Get upcoming event for public view
  if (action === "upcoming") {
    try {
      const event = await storage.getUpcomingEvent();
      if (!event) {
        return res.json(null);
      }
      return res.json({
        id: event.id,
        eventDate: event.eventDate,
        eventType: event.eventType,
        location: event.location,
        startTime: event.startTime,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta event" });
    }
  }

  return res.status(400).json({ message: "Ogiltig förfrågan" });
}
