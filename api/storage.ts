import {
  users,
  gameEvents,
  registrations,
  teams,
  teamMembers,
  matches,
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export const storage = {
  // User operations
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  },

  async createUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string }) {
    const count = await this.getUserCount();
    const isFirstUser = count === 0;

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email.toLowerCase(),
        isAdmin: isFirstUser,
        status: isFirstUser ? "approved" : "pending",
      })
      .returning();
    return user;
  },

  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  },

  async updateUserStatus(userId: string, status: string) {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async getUserCount() {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    return result[0]?.count || 0;
  },

  // Game Events
  async createGameEvent(eventData: any) {
    const [event] = await db.insert(gameEvents).values(eventData).returning();
    return event;
  },

  async getUpcomingEvent() {
    const [event] = await db
      .select()
      .from(gameEvents)
      .where(sql`${gameEvents.status} IN ('open', 'confirmed') AND ${gameEvents.eventDate} >= CURRENT_DATE`)
      .orderBy(gameEvents.eventDate)
      .limit(1);
    return event;
  },

  async getEventById(id: number) {
    const [event] = await db.select().from(gameEvents).where(eq(gameEvents.id, id));
    return event;
  },

  async getAllEvents() {
    return await db.select().from(gameEvents).orderBy(desc(gameEvents.eventDate));
  },

  async updateEventTeamsGenerated(eventId: number) {
    await db.update(gameEvents).set({ teamsGenerated: true }).where(eq(gameEvents.id, eventId));
  },

  async deleteEvent(eventId: number) {
    await db.delete(matches).where(eq(matches.gameEventId, eventId));
    const eventTeams = await this.getTeamsByEvent(eventId);
    for (const team of eventTeams) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
    }
    await db.delete(teams).where(eq(teams.gameEventId, eventId));
    await db.delete(registrations).where(eq(registrations.gameEventId, eventId));
    await db.delete(gameEvents).where(eq(gameEvents.id, eventId));
  },

  // Registrations
  async createRegistration(data: any) {
    const [registration] = await db.insert(registrations).values(data).returning();
    return registration;
  },

  async getRegistrationsByEvent(eventId: number) {
    return await db.select().from(registrations).where(eq(registrations.gameEventId, eventId));
  },

  async getUserRegistrations(userId: string) {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.registeredAt));
  },

  async getUserRegistrationForEvent(userId: string, eventId: number) {
    const [reg] = await db
      .select()
      .from(registrations)
      .where(and(eq(registrations.userId, userId), eq(registrations.gameEventId, eventId)));
    return reg;
  },

  async getRegistrationById(id: number) {
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, id));
    return reg;
  },

  async checkInUser(registrationId: number) {
    const [reg] = await db
      .update(registrations)
      .set({ checkedInAt: new Date() })
      .where(eq(registrations.id, registrationId))
      .returning();
    return reg;
  },

  async getRegistrationCount(eventId: number) {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(eq(registrations.gameEventId, eventId));
    return result[0]?.count || 0;
  },

  // Teams
  async createTeam(data: any) {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  },

  async getTeamsByEvent(eventId: number) {
    return await db.select().from(teams).where(eq(teams.gameEventId, eventId));
  },

  async createTeamMember(data: any) {
    const [member] = await db.insert(teamMembers).values(data).returning();
    return member;
  },

  async getTeamMembers(teamId: number) {
    return await db
      .select({ id: teamMembers.id, teamId: teamMembers.teamId, userId: teamMembers.userId, user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
  },

  // Matches
  async createMatch(data: any) {
    const [match] = await db.insert(matches).values(data).returning();
    return match;
  },

  async getMatchById(id: number) {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  },

  async getMatchesByEvent(eventId: number) {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.gameEventId, eventId))
      .orderBy(matches.roundNumber, matches.id);
  },

  async updateMatchResult(matchId: number, team1Score: number, team2Score: number) {
    const existing = await this.getMatchById(matchId);
    if (!existing) throw new Error("Match not found");

    const winnerId = team1Score > team2Score ? existing.team1Id : existing.team2Id;

    const [match] = await db
      .update(matches)
      .set({ team1Score, team2Score, winnerId, status: "completed", completedAt: new Date() })
      .where(eq(matches.id, matchId))
      .returning();
    return match;
  },

  // Stats
  async getUserStats(userId: string) {
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = userTeams.map((t) => t.teamId);

    if (teamIds.length === 0) {
      return { gamesPlayed: 0, wins: 0, losses: 0, winPercentage: 0, totalPointsScored: 0, totalPointsConceded: 0 };
    }

    const userMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.status, "completed"),
          sql`(${matches.team1Id} = ANY(${teamIds}) OR ${matches.team2Id} = ANY(${teamIds}))`
        )
      );

    let wins = 0, losses = 0, totalPointsScored = 0, totalPointsConceded = 0;

    for (const match of userMatches) {
      const isTeam1 = teamIds.includes(match.team1Id);
      const userScore = isTeam1 ? match.team1Score || 0 : match.team2Score || 0;
      const oppScore = isTeam1 ? match.team2Score || 0 : match.team1Score || 0;
      totalPointsScored += userScore;
      totalPointsConceded += oppScore;
      if (userScore > oppScore) wins++;
      else losses++;
    }

    const gamesPlayed = wins + losses;
    const winPercentage = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    return { gamesPlayed, wins, losses, winPercentage, totalPointsScored, totalPointsConceded };
  },
};
