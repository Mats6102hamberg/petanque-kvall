import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../_storage";
import { getAuthUser } from "../../../_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

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

  try {
    const event = await storage.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event hittades inte" });
    }

    if (event.teamsGenerated) {
      return res.status(400).json({ message: "Lag har redan genererats" });
    }

    const regCount = await storage.getRegistrationCount(eventId);
    if (regCount < event.minPlayers) {
      return res.status(400).json({
        message: `Inte tillräckligt med spelare. Behöver ${event.minPlayers}, har ${regCount}`,
      });
    }

    await generateTeams(eventId);
    return res.json({ message: "Lag genererade" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Kunde inte generera lag" });
  }
}

async function generateTeams(eventId: number) {
  const registrations = await storage.getRegistrationsByEvent(eventId);
  const shuffled = [...registrations].sort(() => Math.random() - 0.5);
  const teamCount = Math.floor(shuffled.length / 2);

  for (let i = 0; i < teamCount; i++) {
    const team = await storage.createTeam({
      gameEventId: eventId,
      teamName: `Lag ${String.fromCharCode(65 + i)}`,
    });

    const memberIds = shuffled.slice(i * 2, i * 2 + 2).map((r) => r.userId);
    for (const memberId of memberIds) {
      await storage.createTeamMember({ teamId: team.id, userId: memberId });
    }
  }

  const allTeams = await storage.getTeamsByEvent(eventId);
  for (let i = 0; i < allTeams.length; i += 2) {
    if (i + 1 < allTeams.length) {
      await storage.createMatch({
        gameEventId: eventId,
        team1Id: allTeams[i].id,
        team2Id: allTeams[i + 1].id,
        roundNumber: 1,
        courtNumber: Math.floor(i / 2) + 1,
        status: "pending",
      });
    }
  }

  await storage.updateEventTeamsGenerated(eventId);
}
