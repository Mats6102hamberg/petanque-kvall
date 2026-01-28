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
    const matchHistory = await getMatchHistory(authUser.userId);
    res.json({ ...stats, matchHistory });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Kunde inte hämta statistik" });
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
      const userTeamScore = isTeam1 ? match.team1Score : match.team2Score;
      const opponentScore = isTeam1 ? match.team2Score : match.team1Score;
      const opponentTeamId = isTeam1 ? match.team2Id : match.team1Id;
      const opponentTeam = eventTeams.find((t) => t.id === opponentTeamId);

      history.push({
        id: match.id,
        eventDate: event.eventDate,
        opponentTeam: opponentTeam?.teamName || "Okänt",
        userTeamScore: userTeamScore || 0,
        opponentScore: opponentScore || 0,
        won: (userTeamScore || 0) > (opponentScore || 0),
        roundNumber: match.roundNumber,
      });
    }
  }

  return history.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
}
