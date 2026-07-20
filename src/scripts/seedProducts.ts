import "dotenv/config";
import dns from "dns";


dns.setServers(["8.8.8.8", "8.8.4.4"]);

// import Design from "../models/Design";
// import { products } from "./products";


// const MONGODB_URI = process.env.MONGODB_URI!;

// async function seedDesigns() {
//     try {
//         await mongoose.connect(MONGODB_URI);

//         console.log("🍀 MongoDB Connected");

//         let inserted = 0;
//         let skipped = 0;

//         for (const design of designs) {
//             const exists = await Design.findOne({
//                 title: design.title,
//             });

//             if (exists) {
//                 skipped++;
//                 console.log(`⏭️ Skipped: ${design.title}`);
//                 continue;
//             }

//             await Design.create(design as any);

//             inserted++;
//             console.log(`✅ Added: ${design.title}`);
//         }

//         console.log("\n==============================");
//         console.log("🎨 Design Seeding Finished");
//         console.log(`✅ Inserted : ${inserted}`);
//         console.log(`⏭️ Skipped  : ${skipped}`);
//         console.log("==============================\n");

//         process.exit(0);
//     } catch (error) {
//         console.error("❌ Seeding Failed");
//         console.error(error);
//         process.exit(1);
//     }
// }

// seedDesigns();



import Product from "../models/Product";

import mongoose from "mongoose";
import { products } from "./products";

const MONGODB_URI = process.env.MONGODB_URI!;

const NAME_TO_HEX_ID: Record<string, string> = {
    "Astrid Bouclé Sofa": "f10000000000000000000001",
    "Nordic Oak Coffee Table": "f10000000000000000000002",
    "Soren Leather Lounge Chair": "f10000000000000000000003",
    "Kyoto Floating Desk": "f10000000000000000000004",
    "Solace Travertine Pendant Light": "110000000000000000000001",
    "Solace Pendant Light": "110000000000000000000001",
    "Helios Matte Black Floor Lamp": "110000000000000000000002",
    "Helios Floor Lamp": "110000000000000000000002",
    "Hovden Wide Oak Planks (Per Sq Ft)": "f11000000000000000000001",
    "Hovden Wide Oak Planks": "f11000000000000000000001",
    "Terrazzo Grey Porcelain Tile (Per Sq Ft)": "f11000000000000000000002",
    "Terrazzo Grey Porcelain Tile": "f11000000000000000000002",
    "Terrazzo Stone Tiles": "f11000000000000000000002",
    "Kobe Sage Matte Wall Paint (1 Gal)": "ba0000000000000000000001",
    "Kobe Sage Matte Wall Paint": "ba0000000000000000000001",
    "Sage Green Interior Paint": "ba0000000000000000000001",
    "Alabaster Silk Wall Paint (1 Gal)": "ba0000000000000000000002",
    "Alabaster Silk Wall Paint": "ba0000000000000000000002",
    "Warm Alabaster Paint": "ba0000000000000000000002",
    "Mesa Wool Area Rug": "de0000000000000000000001",
    "Oasis Ceramic Vase Set": "de0000000000000000000002",
    "Ceramic Ribbed Vase": "de0000000000000000000002"
};

async function seedProducts() {
    try {
        await mongoose.connect(MONGODB_URI);

        console.log("🍀 MongoDB Connected");

        let inserted = 0;
        let skipped = 0;

        for (const product of products) {
            // Name দিয়ে duplicate check
            const exists = await Product.findOne({
                name: product.name,
            });

            if (exists) {
                skipped++;
                console.log(`⏭️  Skipped: ${product.name}`);
                continue;
            }

            const hexId = NAME_TO_HEX_ID[product.name] || new mongoose.Types.ObjectId().toString();

            await Product.create({
                ...product,
                _id: new mongoose.Types.ObjectId(hexId),
                specs: new Map(Object.entries(product.specs || {}))
            } as any);

            inserted++;
            console.log(`✅ Added: ${product.name}`);
        }

        console.log("\n==============================");
        console.log("🌱 Product Seeding Finished");
        console.log(`✅ Inserted : ${inserted}`);
        console.log(`⏭️  Skipped  : ${skipped}`);
        console.log("==============================\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding Failed");
        console.error(error);
        process.exit(1);
    }
}

seedProducts();