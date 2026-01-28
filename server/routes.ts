import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  isAuthenticated,
  hashPassword,
  verifyPassword,
  generateToken,
} from "./auth";
import { requireAdmin } from "./middleware/adminAuth";
import { registerSchema, loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.errors[0]?.message || "Ogiltig data",
        });
      }

      const { email, password, firstName, lastName } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "E-postadressen används redan" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
      });

      // Generate token
      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          status: user.status,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Kunde inte registrera användare" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: result.error.errors[0]?.message || "Ogiltig data",
        });
      }

      const { email, password } = result.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Fel e-post eller lösenord" });
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Fel e-post eller lösenord" });
      }

      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          status: user.status,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Kunde inte logga in" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        status: user.status,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Kunde inte hämta användare" });
    }
  });

  // Events endpoints
  app.get("/api/events/upcoming", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const event = await storage.getUpcomingEvent();

      if (!event) {
        return res.json(null);
      }

      const registrationCount = await storage.getRegistrationCount(event.id);
      const userRegistration = await storage.getUserRegistrationForEvent(
        userId,
        event.id
      );

      res.json({
        ...event,
        registrationCount,
        userRegistered: !!userRegistration,
      });
    } catch (error) {
      console.error("Error fetching upcoming event:", error);
      res.status(500).json({ message: "Kunde inte hämta event" });
    }
  });

  app.get("/api/events/with-matches", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const events = await storage.getAllEventsWithMatches();

      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const matches = await storage.getMatchesByEvent(event.id);

          // Get user's team for this event
          const userRegistration = await storage.getUserRegistrationForEvent(
            userId,
            event.id
          );
          let userTeamId: number | undefined;

          if (userRegistration) {
            const eventTeams = await storage.getTeamsByEvent(event.id);
            for (const team of eventTeams) {
              const members = await storage.getTeamMembers(team.id);
              if (members.some((m) => m.userId === userId)) {
                userTeamId = team.id;
                break;
              }
            }
          }

          // Get full match details with teams and members
          const matchesWithDetails = await Promise.all(
            matches.map(async (match) => {
              const team1Members = await storage.getTeamMembers(match.team1Id);
              const team2Members = await storage.getTeamMembers(match.team2Id);
              const allTeams = await storage.getTeamsByEvent(event.id);
              const matchTeam1 = allTeams.find((t) => t.id === match.team1Id);
              const matchTeam2 = allTeams.find((t) => t.id === match.team2Id);

              return {
                ...match,
                team1: {
                  ...matchTeam1!,
                  members: team1Members,
                },
                team2: {
                  ...matchTeam2!,
                  members: team2Members,
                },
              };
            })
          );

          return {
            ...event,
            matches: matchesWithDetails,
            userTeamId,
          };
        })
      );

      res.json(eventsWithDetails);
    } catch (error) {
      console.error("Error fetching events with matches:", error);
      res.status(500).json({ message: "Kunde inte hämta events" });
    }
  });

  // Registrations endpoints
  app.post("/api/registrations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { gameEventId, phoneNumber } = req.body;

      if (!gameEventId) {
        return res.status(400).json({ message: "Event ID krävs" });
      }

      // Check user status
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      if (user.status === "pending") {
        return res.status(403).json({
          message:
            "Din användare är under granskning. Admin måste godkänna dig innan du kan anmäla dig.",
        });
      }

      if (user.status === "inactive") {
        return res.status(403).json({
          message:
            "Ditt konto är inaktiverat. Kontakta admin för mer information.",
        });
      }

      // Get the event
      const event = await storage.getEventById(gameEventId);
      if (!event) {
        return res.status(404).json({ message: "Event hittades inte" });
      }

      // Check if already registered
      const existingRegistration = await storage.getUserRegistrationForEvent(
        userId,
        gameEventId
      );
      if (existingRegistration) {
        return res
          .status(400)
          .json({ message: "Du är redan anmäld till detta event" });
      }

      // Create registration
      const registration = await storage.createRegistration({
        gameEventId,
        userId,
        phoneNumber,
        paymentStatus: "confirmed",
      });

      // Check if we have enough players to generate teams
      const registrationCount = await storage.getRegistrationCount(gameEventId);

      if (registrationCount >= event.minPlayers && !event.teamsGenerated) {
        await generateTeams(gameEventId);
      }

      res.json(registration);
    } catch (error) {
      console.error("Error creating registration:", error);
      res.status(500).json({ message: "Kunde inte skapa anmälan" });
    }
  });

  app.get("/api/registrations/:eventId", isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const registrations = await storage.getRegistrationsByEvent(eventId);

      const registrationsWithUsers = await Promise.all(
        registrations.map(async (reg) => {
          const user = await storage.getUserById(reg.userId);
          return {
            ...reg,
            user: user
              ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }
              : null,
          };
        })
      );

      res.json(registrationsWithUsers);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Kunde inte hämta anmälningar" });
    }
  });

  app.get("/api/registrations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const registrations = await storage.getUserRegistrations(userId);

      const registrationsWithEvents = await Promise.all(
        registrations.map(async (reg) => {
          const event = await storage.getEventById(reg.gameEventId);
          return {
            ...reg,
            event,
          };
        })
      );

      res.json(registrationsWithEvents);
    } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ message: "Kunde inte hämta anmälningar" });
    }
  });

  // Matches endpoints
  app.get("/api/matches/:id", isAuthenticated, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const match = await storage.getMatchById(matchId);

      if (!match) {
        return res.status(404).json({ message: "Match hittades inte" });
      }

      const team1Members = await storage.getTeamMembers(match.team1Id);
      const team2Members = await storage.getTeamMembers(match.team2Id);
      const allTeams = await storage.getTeamsByEvent(match.gameEventId);
      const team1 = allTeams.find((t) => t.id === match.team1Id);
      const team2 = allTeams.find((t) => t.id === match.team2Id);

      res.json({
        ...match,
        team1: {
          ...team1,
          members: team1Members,
        },
        team2: {
          ...team2,
          members: team2Members,
        },
      });
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ message: "Kunde inte hämta match" });
    }
  });

  app.patch("/api/matches/:id/result", isAuthenticated, async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const { team1Score, team2Score } = req.body;

      if (typeof team1Score !== "number" || typeof team2Score !== "number") {
        return res.status(400).json({ message: "Ogiltiga poäng" });
      }

      if (team1Score < 0 || team2Score < 0) {
        return res.status(400).json({ message: "Poäng kan inte vara negativa" });
      }

      const match = await storage.updateMatchResult(
        matchId,
        team1Score,
        team2Score
      );
      res.json(match);
    } catch (error) {
      console.error("Error updating match result:", error);
      res.status(500).json({ message: "Kunde inte uppdatera resultat" });
    }
  });

  // Statistics endpoints
  app.get("/api/stats/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Kunde inte hämta statistik" });
    }
  });

  app.get("/api/stats/detailed", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.userId;
      const stats = await storage.getUserStats(userId);
      const matchHistory = await getMatchHistory(userId);

      res.json({
        ...stats,
        matchHistory,
      });
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
      res.status(500).json({ message: "Kunde inte hämta statistik" });
    }
  });

  // Admin endpoints
  app.post(
    "/api/admin/events",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const event = await storage.createGameEvent(req.body);
        res.json(event);
      } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Kunde inte skapa event" });
      }
    }
  );

  app.get(
    "/api/admin/events",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const events = await storage.getAllEventsWithMatches();

        const eventsWithCounts = await Promise.all(
          events.map(async (event) => {
            const registrationCount = await storage.getRegistrationCount(
              event.id
            );
            const matches = await storage.getMatchesByEvent(event.id);
            return {
              ...event,
              registrationCount,
              matchCount: matches.length,
            };
          })
        );

        res.json(eventsWithCounts);
      } catch (error) {
        console.error("Error fetching admin events:", error);
        res.status(500).json({ message: "Kunde inte hämta events" });
      }
    }
  );

  app.post(
    "/api/admin/events/:id/generate-teams",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const eventId = parseInt(req.params.id);
        const event = await storage.getEventById(eventId);

        if (!event) {
          return res.status(404).json({ message: "Event hittades inte" });
        }

        if (event.teamsGenerated) {
          return res
            .status(400)
            .json({ message: "Lag har redan genererats för detta event" });
        }

        const registrationCount = await storage.getRegistrationCount(eventId);

        if (registrationCount < event.minPlayers) {
          return res.status(400).json({
            message: `Inte tillräckligt med spelare. Behöver minst ${event.minPlayers}, har ${registrationCount}`,
          });
        }

        await generateTeams(eventId);
        res.json({ message: "Lag genererade" });
      } catch (error) {
        console.error("Error generating teams:", error);
        res.status(500).json({ message: "Kunde inte generera lag" });
      }
    }
  );

  app.delete(
    "/api/admin/events/:id",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const eventId = parseInt(req.params.id);

        if (isNaN(eventId) || eventId <= 0) {
          return res.status(400).json({ message: "Ogiltigt event ID" });
        }

        const event = await storage.getEventById(eventId);

        if (!event) {
          return res.status(404).json({ message: "Event hittades inte" });
        }

        await storage.deleteEvent(eventId);
        res.json({ message: "Event borttaget" });
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ message: "Kunde inte ta bort event" });
      }
    }
  );

  // Admin user management
  app.get(
    "/api/admin/users",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const allUsers = await storage.getAllUsers();
        res.json(
          allUsers.map((u) => ({
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            isAdmin: u.isAdmin,
            status: u.status,
            createdAt: u.createdAt,
          }))
        );
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Kunde inte hämta användare" });
      }
    }
  );

  app.patch(
    "/api/admin/users/:id/status",
    isAuthenticated,
    requireAdmin,
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { status } = req.body;

        if (!["pending", "approved", "inactive"].includes(status)) {
          return res.status(400).json({
            message:
              "Ogiltig status. Måste vara 'pending', 'approved', eller 'inactive'",
          });
        }

        const user = await storage.updateUserStatus(userId, status);
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          status: user.status,
        });
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).json({ message: "Kunde inte uppdatera användarstatus" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate teams for an event
async function generateTeams(eventId: number): Promise<void> {
  const registrations = await storage.getRegistrationsByEvent(eventId);

  if (registrations.length < 16) {
    return;
  }

  // Shuffle registrations for random team assignment
  const shuffled = [...registrations].sort(() => Math.random() - 0.5);

  // Create teams (2 players per team)
  const teamCount = Math.floor(shuffled.length / 2);

  for (let i = 0; i < teamCount; i++) {
    const teamName = `Lag ${String.fromCharCode(65 + i)}`;
    const team = await storage.createTeam({
      gameEventId: eventId,
      teamName,
    });

    const memberIds = shuffled.slice(i * 2, i * 2 + 2).map((r) => r.userId);

    for (const memberId of memberIds) {
      await storage.createTeamMember({
        teamId: team.id,
        userId: memberId,
      });
    }
  }

  // Generate matches
  const allTeams = await storage.getTeamsByEvent(eventId);

  if (allTeams.length >= 2) {
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
  }

  await storage.updateEventTeamsGenerated(eventId);
}

// Helper function to get match history for a user
async function getMatchHistory(userId: string): Promise<any[]> {
  const allEvents = await storage.getAllEventsWithMatches();
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
      if (match.team1Id !== userTeam.id && match.team2Id !== userTeam.id)
        continue;

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

  return history.sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
}
