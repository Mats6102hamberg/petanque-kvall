import { db } from "./db";
import { gameEvents } from "@shared/schema";

async function seed() {
  try {
    console.log("Creating initial game event...");

    // Create upcoming event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(gameEvents).values({
      eventDate: tomorrow.toISOString().split("T")[0],
      eventType: "Kvällsspel",
      location: "Boulebanan",
      startTime: "18:00",
      status: "open",
      entryFee: 50,
      minPlayers: 16,
      teamsGenerated: false,
    });

    console.log("Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
