import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./storage";
import { getAuthUser } from "./authHelpers";

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

    // If detailed stats requested
    if (req.query.detailed === "true") {
      const matchHistory = await getMatchHistory(authUser.userId);
      return res.json({ ...stats, matchHistory });
    }

    return res.json(stats);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Kunde inte hämta statistik" });
  }
}

async function getMatchHistory(userId: string) {
  const allEvents = await storage.getAllEvents();
  const history: any[] = [];

  for (const event of allEvents) {
    if (event.status !== "completed") continue;

    const eventTeams = await storage.getTeamsByEvent(event.id);
    let userTeam: any = null;

    for (const team of eventTeams) {
      const members = await storage.getTeamMembers(team.id);
      if (members.some((m) => m.userId === userId)) {
        userTeam = team;
        break;
      }
    }

    if (!userTeam) continue;

    const eventMatches = await storage.getMatchesByEvent(event.id);

    for (const match of eventMatches) {
      if (match.status !== "completed") continue;
      if (match.team1Id !== userTeam.id && match.team2Id !== userTeam.id) continue;

      const isTeam1 = match.team1Id === userTeam.id;
      history.push({
        id: match.id,
        eventDate: event.eventDate,
        opponentTeam: eventTeams.find((t) => t.id === (isTeam1 ? match.team2Id : match.team1Id))?.teamName || "Okänt",
        userTeamScore: isTeam1 ? match.team1Score : match.team2Score,
        opponentScore: isTeam1 ? match.team2Score : match.team1Score,
        won: (isTeam1 ? match.team1Score : match.team2Score)! > (isTeam1 ? match.team2Score : match.team1Score)!,
        roundNumber: match.roundNumber,
      });
    }
  }

  return history.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}
