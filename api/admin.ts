import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { gameEvents, teams, matches, registrations, teamMembers } from "./schema";
import { eq, desc, sql as sqlFn } from "drizzle-orm";

// Create db connection directly in this file to avoid import issues
const sql = neon(process.env.DATABASE_URL || "");
const db = drizzle(sql);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = req.query.resource as string;
  const id = req.query.id as string;
  const action = req.query.action as string;

  try {
    // GET /api/admin?resource=events
    if (req.method === "GET" && resource === "events") {
      const events = await db.select().from(gameEvents).orderBy(desc(gameEvents.eventDate));

      const eventsWithCounts = await Promise.all(
        events.map(async (event) => {
          const regResult = await db.select({ count: sqlFn<number>`count(*)::int` }).from(registrations).where(eq(registrations.gameEventId, event.id));
          const matchResult = await db.select().from(matches).where(eq(matches.gameEventId, event.id));
          return { ...event, registrationCount: regResult[0]?.count || 0, matchCount: matchResult.length };
        })
      );
      return res.json(eventsWithCounts);
    }

    // POST /api/admin?resource=events
    if (req.method === "POST" && resource === "events") {
      const [event] = await db.insert(gameEvents).values(req.body).returning();
      return res.json(event);
    }

    // DELETE /api/admin?resource=events&id=X
    if (req.method === "DELETE" && resource === "events" && id) {
      const eventId = parseInt(id);

      // Delete in correct order
      await db.delete(matches).where(eq(matches.gameEventId, eventId));
      const eventTeams = await db.select().from(teams).where(eq(teams.gameEventId, eventId));
      for (const team of eventTeams) {
        await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
      }
      await db.delete(teams).where(eq(teams.gameEventId, eventId));
      await db.delete(registrations).where(eq(registrations.gameEventId, eventId));
      await db.delete(gameEvents).where(eq(gameEvents.id, eventId));

      return res.json({ message: "Event borttaget" });
    }

    // POST /api/admin?resource=events&id=X&action=generate-teams
    if (req.method === "POST" && resource === "events" && id && action === "generate-teams") {
      const eventId = parseInt(id);
      const [event] = await db.select().from(gameEvents).where(eq(gameEvents.id, eventId));

      if (!event) return res.status(404).json({ message: "Event hittades inte" });
      if (event.teamsGenerated) return res.status(400).json({ message: "Lag har redan genererats" });

      const eventRegs = await db.select().from(registrations).where(eq(registrations.gameEventId, eventId));
      if (eventRegs.length < 4) {
        return res.status(400).json({ message: `Behöver minst 4 spelare, har ${eventRegs.length}` });
      }

      // Generate teams
      const shuffled = [...eventRegs].sort(() => Math.random() - 0.5);
      const teamCount = Math.floor(shuffled.length / 2);

      for (let i = 0; i < teamCount; i++) {
        const [team] = await db.insert(teams).values({ gameEventId: eventId, teamName: `Lag ${String.fromCharCode(65 + i)}` }).returning();
        const memberIds = shuffled.slice(i * 2, i * 2 + 2).map((r) => r.userId);
        for (const memberId of memberIds) {
          await db.insert(teamMembers).values({ teamId: team.id, userId: memberId });
        }
      }

      const allTeams = await db.select().from(teams).where(eq(teams.gameEventId, eventId));
      for (let i = 0; i < allTeams.length; i += 2) {
        if (i + 1 < allTeams.length) {
          await db.insert(matches).values({
            gameEventId: eventId,
            team1Id: allTeams[i].id,
            team2Id: allTeams[i + 1].id,
            roundNumber: 1,
            courtNumber: Math.floor(i / 2) + 1,
            status: "pending"
          });
        }
      }

      await db.update(gameEvents).set({ teamsGenerated: true }).where(eq(gameEvents.id, eventId));
      return res.json({ message: "Lag genererade" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Admin API Error:", error);
    return res.status(500).json({
      message: "Ett fel uppstod",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
