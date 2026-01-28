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
            const matchTeam1 = allTeams.find((t) => t.id === match.team1Id);
            const matchTeam2 = allTeams.find((t) => t.id === match.team2Id);

            return {
              ...match,
              team1: { ...matchTeam1!, members: team1Members },
              team2: { ...matchTeam2!, members: team2Members },
            };
          })
        );

        return { ...event, matches: matchesWithDetails, userTeamId };
      })
    );

    res.json(eventsWithDetails);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Kunde inte hämta events" });
  }
}
