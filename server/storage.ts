import {
  users,
  gameEvents,
  registrations,
  teams,
  teamMembers,
  matches,
  type User,
  type UpsertUser,
  type GameEvent,
  type InsertGameEvent,
  type Registration,
  type InsertRegistration,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Match,
  type InsertMatch,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, "id">): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  getUserCount(): Promise<number>;

  // Game Events
  createGameEvent(event: InsertGameEvent): Promise<GameEvent>;
  getUpcomingEvent(): Promise<GameEvent | undefined>;
  getEventById(id: number): Promise<GameEvent | undefined>;
  getAllEventsWithMatches(): Promise<GameEvent[]>;
  updateEventTeamsGenerated(eventId: number): Promise<void>;
  deleteEvent(eventId: number): Promise<void>;

  // Registrations
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistrationsByEvent(eventId: number): Promise<Registration[]>;
  getUserRegistrations(userId: string): Promise<Registration[]>;
  getUserRegistrationForEvent(
    userId: string,
    eventId: number
  ): Promise<Registration | undefined>;
  getRegistrationCount(eventId: number): Promise<number>;

  // Teams
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamsByEvent(eventId: number): Promise<Team[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<Array<TeamMember & { user: User }>>;

  // Matches
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchById(id: number): Promise<Match | undefined>;
  getMatchesByEvent(eventId: number): Promise<Match[]>;
  updateMatchResult(
    matchId: number,
    team1Score: number,
    team2Score: number
  ): Promise<Match>;

  // Statistics
  getUserStats(userId: string): Promise<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winPercentage: number;
    totalPointsScored: number;
    totalPointsConceded: number;
    currentRanking: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, "id">): Promise<User> {
    // Check if this is the first user
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
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    return result[0]?.count || 0;
  }

  // Game Events
  async createGameEvent(eventData: InsertGameEvent): Promise<GameEvent> {
    const [event] = await db
      .insert(gameEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async getUpcomingEvent(): Promise<GameEvent | undefined> {
    const [event] = await db
      .select()
      .from(gameEvents)
      .where(
        sql`${gameEvents.status} IN ('open', 'confirmed') AND ${gameEvents.eventDate} >= CURRENT_DATE`
      )
      .orderBy(gameEvents.eventDate)
      .limit(1);
    return event;
  }

  async getEventById(id: number): Promise<GameEvent | undefined> {
    const [event] = await db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.id, id));
    return event;
  }

  async getAllEventsWithMatches(): Promise<GameEvent[]> {
    const events = await db
      .select()
      .from(gameEvents)
      .orderBy(desc(gameEvents.eventDate));
    return events;
  }

  async updateEventTeamsGenerated(eventId: number): Promise<void> {
    await db
      .update(gameEvents)
      .set({ teamsGenerated: true })
      .where(eq(gameEvents.id, eventId));
  }

  async deleteEvent(eventId: number): Promise<void> {
    // Delete related data first (foreign key constraints)
    await db.delete(matches).where(eq(matches.gameEventId, eventId));

    // Delete team members for all teams in this event
    const eventTeams = await this.getTeamsByEvent(eventId);
    for (const team of eventTeams) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
    }

    // Delete teams
    await db.delete(teams).where(eq(teams.gameEventId, eventId));

    // Delete registrations
    await db
      .delete(registrations)
      .where(eq(registrations.gameEventId, eventId));

    // Finally delete the event
    await db.delete(gameEvents).where(eq(gameEvents.id, eventId));
  }

  // Registrations
  async createRegistration(
    registrationData: InsertRegistration
  ): Promise<Registration> {
    const [registration] = await db
      .insert(registrations)
      .values(registrationData)
      .returning();
    return registration;
  }

  async getRegistrationsByEvent(eventId: number): Promise<Registration[]> {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.gameEventId, eventId));
  }

  async getUserRegistrations(userId: string): Promise<Registration[]> {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.registeredAt));
  }

  async getUserRegistrationForEvent(
    userId: string,
    eventId: number
  ): Promise<Registration | undefined> {
    const [registration] = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.gameEventId, eventId)
        )
      );
    return registration;
  }

  async getRegistrationCount(eventId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(eq(registrations.gameEventId, eventId));
    return result[0]?.count || 0;
  }

  // Teams
  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(teamData).returning();
    return team;
  }

  async getTeamsByEvent(eventId: number): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.gameEventId, eventId));
  }

  async createTeamMember(memberData: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(memberData)
      .returning();
    return member;
  }

  async getTeamMembers(
    teamId: number
  ): Promise<Array<TeamMember & { user: User }>> {
    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    return members;
  }

  // Matches
  async createMatch(matchData: InsertMatch): Promise<Match> {
    const [match] = await db.insert(matches).values(matchData).returning();
    return match;
  }

  async getMatchById(id: number): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id));
    return match;
  }

  async getMatchesByEvent(eventId: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.gameEventId, eventId))
      .orderBy(matches.roundNumber, matches.id);
  }

  async updateMatchResult(
    matchId: number,
    team1Score: number,
    team2Score: number
  ): Promise<Match> {
    const existingMatch = await this.getMatchById(matchId);
    if (!existingMatch) {
      throw new Error("Match not found");
    }

    const winnerId =
      team1Score > team2Score
        ? existingMatch.team1Id
        : existingMatch.team2Id;

    const [match] = await db
      .update(matches)
      .set({
        team1Score,
        team2Score,
        winnerId,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(matches.id, matchId))
      .returning();
    return match;
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winPercentage: number;
    totalPointsScored: number;
    totalPointsConceded: number;
    currentRanking: number;
  }> {
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = userTeams.map((t) => t.teamId);

    if (teamIds.length === 0) {
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winPercentage: 0,
        totalPointsScored: 0,
        totalPointsConceded: 0,
        currentRanking: 0,
      };
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

    let wins = 0;
    let losses = 0;
    let totalPointsScored = 0;
    let totalPointsConceded = 0;

    for (const match of userMatches) {
      const isTeam1 = teamIds.includes(match.team1Id);
      const userScore = isTeam1
        ? match.team1Score || 0
        : match.team2Score || 0;
      const opponentScore = isTeam1
        ? match.team2Score || 0
        : match.team1Score || 0;

      totalPointsScored += userScore;
      totalPointsConceded += opponentScore;

      if (userScore > opponentScore) {
        wins++;
      } else {
        losses++;
      }
    }

    const gamesPlayed = wins + losses;
    const winPercentage =
      gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

    return {
      gamesPlayed,
      wins,
      losses,
      winPercentage,
      totalPointsScored,
      totalPointsConceded,
      currentRanking: 1,
    };
  }
}

export const storage = new DatabaseStorage();
