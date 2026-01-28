import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_storage";
import { getAuthUser } from "./_auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(authUser.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const resource = req.query.resource as string;
  const id = req.query.id as string;
  const action = req.query.action as string;

  // GET /api/admin?resource=users
  if (req.method === "GET" && resource === "users") {
    try {
      const allUsers = await storage.getAllUsers();
      return res.json(allUsers.map((u) => ({
        id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
        isAdmin: u.isAdmin, status: u.status, createdAt: u.createdAt,
      })));
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta användare" });
    }
  }

  // PATCH /api/admin?resource=users&id=X&action=status
  if (req.method === "PATCH" && resource === "users" && id && action === "status") {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Ogiltig status" });
      }
      const updatedUser = await storage.updateUserStatus(id, status);
      return res.json({
        id: updatedUser.id, email: updatedUser.email, firstName: updatedUser.firstName,
        lastName: updatedUser.lastName, isAdmin: updatedUser.isAdmin, status: updatedUser.status,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte uppdatera status" });
    }
  }

  // GET /api/admin?resource=events
  if (req.method === "GET" && resource === "events") {
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

  // POST /api/admin?resource=events
  if (req.method === "POST" && resource === "events") {
    try {
      const event = await storage.createGameEvent(req.body);
      return res.json(event);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte skapa event" });
    }
  }

  // DELETE /api/admin?resource=events&id=X
  if (req.method === "DELETE" && resource === "events" && id) {
    try {
      const eventId = parseInt(id);
      const event = await storage.getEventById(eventId);
      if (!event) return res.status(404).json({ message: "Event hittades inte" });
      await storage.deleteEvent(eventId);
      return res.json({ message: "Event borttaget" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte ta bort event" });
    }
  }

  // POST /api/admin?resource=events&id=X&action=generate-teams
  if (req.method === "POST" && resource === "events" && id && action === "generate-teams") {
    try {
      const eventId = parseInt(id);
      const event = await storage.getEventById(eventId);
      if (!event) return res.status(404).json({ message: "Event hittades inte" });
      if (event.teamsGenerated) return res.status(400).json({ message: "Lag har redan genererats" });

      const regCount = await storage.getRegistrationCount(eventId);
      if (regCount < event.minPlayers) {
        return res.status(400).json({ message: `Inte tillräckligt med spelare. Behöver ${event.minPlayers}, har ${regCount}` });
      }

      await generateTeams(eventId);
      return res.json({ message: "Lag genererade" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte generera lag" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

async function generateTeams(eventId: number) {
  const registrations = await storage.getRegistrationsByEvent(eventId);
  const shuffled = [...registrations].sort(() => Math.random() - 0.5);
  const teamCount = Math.floor(shuffled.length / 2);

  for (let i = 0; i < teamCount; i++) {
    const team = await storage.createTeam({ gameEventId: eventId, teamName: `Lag ${String.fromCharCode(65 + i)}` });
    const memberIds = shuffled.slice(i * 2, i * 2 + 2).map((r) => r.userId);
    for (const memberId of memberIds) {
      await storage.createTeamMember({ teamId: team.id, userId: memberId });
    }
  }

  const allTeams = await storage.getTeamsByEvent(eventId);
  for (let i = 0; i < allTeams.length; i += 2) {
    if (i + 1 < allTeams.length) {
      await storage.createMatch({ gameEventId: eventId, team1Id: allTeams[i].id, team2Id: allTeams[i + 1].id, roundNumber: 1, courtNumber: Math.floor(i / 2) + 1, status: "pending" });
    }
  }

  await storage.updateEventTeamsGenerated(eventId);
}
