import "dotenv/config";
import { runMigrations } from "./db.js";

await runMigrations();
console.log("Migrations applied.");
