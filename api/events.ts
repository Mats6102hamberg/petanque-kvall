import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_storage";
import { getAuthUser } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // GET /api/events?type=upcoming
  if (req.method === "GET" && req.query.type === "upcoming") {
    try {
      const event = await storage.getUpcomingEvent();
      if (!event) return res.json(null);

      const registrationCount = await storage.getRegistrationCount(event.id);
      const userRegistration = await storage.getUserRegistrationForEvent(authUser.userId, event.id);
      return res.json({ ...event, registrationCount, userRegistered: !!userRegistration });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta event" });
    }
  }

  // GET /api/events?type=with-matches
  if (req.method === "GET" && req.query.type === "with-matches") {
    try {
      const events = await storage.getAllEvents();
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const matches = await storage.getMatchesByEvent(event.id);
          const userReg = await storage.getUserRegistrationForEvent(authUser.userId, event.id);
          let userTeamId: number | undefined;

          if (userReg) {
            const eventTeams = await storage.getTeamsByEvent(event.id);
            for (const team of eventTeams) {
              const members = await storage.getTeamMembers(team.id);
              if (members.some((m) => m.userId === authUser.userId)) {
                userTeamId = team.id;
                break;
              }
            }
          }

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

          return { ...event, matches: matchesWithDetails, userTeamId };
        })
      );
      return res.json(eventsWithDetails);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta events" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
