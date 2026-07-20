// Master seed script to run both product and design seeds
import "dotenv/config";
import { seedProducts } from "./seedProducts";
import { seedDesigns } from "./seedDesigns";

(async () => {
  console.log("🚀 Starting full database seeding...");
  await seedProducts();
  await seedDesigns();
  console.log("✅ Seeding complete.");
})();
