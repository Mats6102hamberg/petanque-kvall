import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_storage";
import { getAuthUser } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const matchId = req.query.id ? parseInt(req.query.id as string) : null;

  // GET /api/matches?id=X
  if (req.method === "GET" && matchId) {
    try {
      const match = await storage.getMatchById(matchId);
      if (!match) return res.status(404).json({ message: "Match hittades inte" });

      const team1Members = await storage.getTeamMembers(match.team1Id);
      const team2Members = await storage.getTeamMembers(match.team2Id);
      const allTeams = await storage.getTeamsByEvent(match.gameEventId);

      return res.json({
        ...match,
        team1: { ...allTeams.find((t) => t.id === match.team1Id), members: team1Members },
        team2: { ...allTeams.find((t) => t.id === match.team2Id), members: team2Members },
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta match" });
    }
  }

  // PATCH /api/matches?id=X (update result)
  if (req.method === "PATCH" && matchId) {
    try {
      const { team1Score, team2Score } = req.body;
      if (typeof team1Score !== "number" || typeof team2Score !== "number") {
        return res.status(400).json({ message: "Ogiltiga poäng" });
      }
      if (team1Score < 0 || team2Score < 0) {
        return res.status(400).json({ message: "Poäng kan inte vara negativa" });
      }

      const match = await storage.updateMatchResult(matchId, team1Score, team2Score);
      return res.json(match);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte uppdatera resultat" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
