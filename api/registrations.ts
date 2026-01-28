import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./storage";
import { getAuthUser } from "./authHelpers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // GET /api/registrations - my registrations
  if (req.method === "GET" && !req.query.eventId) {
    try {
      const registrations = await storage.getUserRegistrations(authUser.userId);
      const registrationsWithEvents = await Promise.all(
        registrations.map(async (reg) => {
          const event = await storage.getEventById(reg.gameEventId);
          return { ...reg, event };
        })
      );
      return res.json(registrationsWithEvents);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta anmälningar" });
    }
  }

  // GET /api/registrations?eventId=X
  if (req.method === "GET" && req.query.eventId) {
    try {
      const eventId = parseInt(req.query.eventId as string);
      const registrations = await storage.getRegistrationsByEvent(eventId);
      const registrationsWithUsers = await Promise.all(
        registrations.map(async (reg) => {
          const user = await storage.getUser(reg.userId);
          return { ...reg, user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null };
        })
      );
      return res.json(registrationsWithUsers);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte hämta anmälningar" });
    }
  }

  // POST /api/registrations
  if (req.method === "POST") {
    try {
      const { gameEventId, phoneNumber } = req.body;
      if (!gameEventId) return res.status(400).json({ message: "Event ID krävs" });

      const user = await storage.getUser(authUser.userId);
      if (!user) return res.status(404).json({ message: "Användare hittades inte" });
      if (user.status === "pending") return res.status(403).json({ message: "Din användare väntar på godkännande" });
      if (user.status === "inactive") return res.status(403).json({ message: "Ditt konto är inaktiverat" });

      const event = await storage.getEventById(gameEventId);
      if (!event) return res.status(404).json({ message: "Event hittades inte" });

      const existing = await storage.getUserRegistrationForEvent(authUser.userId, gameEventId);
      if (existing) return res.status(400).json({ message: "Du är redan anmäld" });

      const registration = await storage.createRegistration({ gameEventId, userId: authUser.userId, phoneNumber, paymentStatus: "confirmed" });

      const regCount = await storage.getRegistrationCount(gameEventId);
      if (regCount >= event.minPlayers && !event.teamsGenerated) {
        await generateTeams(gameEventId);
      }

      return res.json(registration);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ message: "Kunde inte skapa anmälan" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

async function generateTeams(eventId: number) {
  const registrations = await storage.getRegistrationsByEvent(eventId);
  if (registrations.length < 16) return;

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
