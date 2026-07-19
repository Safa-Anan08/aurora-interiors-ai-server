import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import Design from "../models/Design";
import { designs } from "./products";


const MONGODB_URI = process.env.MONGODB_URI!;

async function seedDesigns() {
    try {
        await mongoose.connect(MONGODB_URI);

        console.log("🍀 MongoDB Connected");

        let inserted = 0;
        let skipped = 0;

        for (const design of designs) {
            const exists = await Design.findOne({
                title: design.title,
            });

            if (exists) {
                skipped++;
                console.log(`⏭️ Skipped: ${design.title}`);
                continue;
            }

            await Design.create(design as any);

            inserted++;
            console.log(`✅ Added: ${design.title}`);
        }

        console.log("\n==============================");
        console.log("🎨 Design Seeding Finished");
        console.log(`✅ Inserted : ${inserted}`);
        console.log(`⏭️ Skipped  : ${skipped}`);
        console.log("==============================\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed");
        console.error(error);
        process.exit(1);
    }
}

seedDesigns();