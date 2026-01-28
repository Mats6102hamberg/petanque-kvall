import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
  date,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
  firstName: z.string().min(1, "Förnamn krävs"),
  lastName: z.string().min(1, "Efternamn krävs"),
});

export const loginSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  password: z.string().min(1, "Lösenord krävs"),
});

// Game events (när det är dags att spela boule)
export const gameEvents = pgTable("game_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventDate: date("event_date").notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  location: varchar("location", { length: 100 }),
  startTime: time("start_time"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  entryFee: integer("entry_fee").notNull().default(50),
  minPlayers: integer("min_players").notNull().default(16),
  teamsGenerated: boolean("teams_generated").notNull().default(false),
  allowLateRegistrations: boolean("allow_late_registrations").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GameEvent = typeof gameEvents.$inferSelect;
export type InsertGameEvent = typeof gameEvents.$inferInsert;

export const insertGameEventSchema = createInsertSchema(gameEvents).omit({
  id: true,
  createdAt: true,
});

// Registrations (anmälningar till events)
export const registrations = pgTable("registrations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameEventId: integer("game_event_id").notNull().references(() => gameEvents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  phoneNumber: varchar("phone_number", { length: 20 }),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
});

// Teams (lag som lottas)
export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameEventId: integer("game_event_id").notNull().references(() => gameEvents.id),
  teamName: varchar("team_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Team members (vilka spelare som är i vilket lag)
export const teamMembers = pgTable("team_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Matches (matcher mellan lag)
export const matches = pgTable("matches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameEventId: integer("game_event_id").notNull().references(() => gameEvents.id),
  team1Id: integer("team1_id").notNull().references(() => teams.id),
  team2Id: integer("team2_id").notNull().references(() => teams.id),
  courtNumber: integer("court_number"),
  roundNumber: integer("round_number").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  team1Score: integer("team1_score"),
  team2Score: integer("team2_score"),
  winnerId: integer("winner_id").references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  registrations: many(registrations),
  teamMembers: many(teamMembers),
}));

export const gameEventsRelations = relations(gameEvents, ({ many }) => ({
  registrations: many(registrations),
  teams: many(teams),
  matches: many(matches),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  gameEvent: one(gameEvents, {
    fields: [registrations.gameEventId],
    references: [gameEvents.id],
  }),
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  gameEvent: one(gameEvents, {
    fields: [teams.gameEventId],
    references: [gameEvents.id],
  }),
  members: many(teamMembers),
  matchesAsTeam1: many(matches, { relationName: "team1" }),
  matchesAsTeam2: many(matches, { relationName: "team2" }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  gameEvent: one(gameEvents, {
    fields: [matches.gameEventId],
    references: [gameEvents.id],
  }),
  team1: one(teams, {
    fields: [matches.team1Id],
    references: [teams.id],
    relationName: "team1",
  }),
  team2: one(teams, {
    fields: [matches.team2Id],
    references: [teams.id],
    relationName: "team2",
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
  }),
}));
