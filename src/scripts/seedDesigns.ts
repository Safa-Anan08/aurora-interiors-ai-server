// Seed script for Designs - idempotent implementation
import "dotenv/config";
import mongoose from "mongoose";
import Design from "../models/Design";
import { designs } from "./designs";

const MONGODB_URI = process.env.MONGODB_URI!;

/**
 * Seed Designs collection without duplicating existing documents.
 * Uses the design title as a unique identifier.
 */
export async function seedDesigns(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("🍀 MongoDB Connected (Designs seed)");

    let inserted = 0;
    let skipped = 0;

    for (const design of designs) {
      const exists = await Design.findOne({ title: design.title });
      if (exists) {
        skipped++;
        console.log(`⏭️  Skipped (exists): ${design.title}`);
        continue;
      }

      await Design.create({
        ...design,
        recommendedProductIds: []
      } as any);
      inserted++;
      console.log(`✅ Added: ${design.title}`);
    }

    console.log("\n==============================");
    console.log("🎨 Design Seeding Finished");
    console.log(`✅ Inserted : ${inserted}`);
    console.log(`⏭️  Skipped  : ${skipped}`);
    console.log("==============================\n");
  } catch (error) {
    console.error("❌ [seed]: Design seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Execute when run directly
if (require.main === module) {
  seedDesigns();
}

