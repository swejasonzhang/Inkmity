// ESM script to wipe Users and Reviews
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load envs in order of specificity. This includes .env.development.
const envCandidates = [
  "../.env.development.local",
  "../.env.local",
  "../.env.development",
  "../.env",
];

let loaded = false;
for (const rel of envCandidates) {
  const path = resolve(__dirname, rel);
  const { error } = dotenv.config({ path });
  if (!error) {
    console.log(`[env] loaded ${rel}`);
    loaded = true;
    break;
  }
}
if (!loaded)
  console.warn("[env] no env file loaded (falling back to process env)");

async function wipe() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) not set");

    await connectDB(); // uses the env we just loaded

    const db = mongoose.connection.db;

    const usersExists = await db.listCollections({ name: "users" }).hasNext();
    const reviewsExists = await db
      .listCollections({ name: "reviews" })
      .hasNext();

    if (usersExists) {
      const r = await db.collection("users").deleteMany({});
      console.log(`Deleted users: ${r.deletedCount ?? 0}`);
    } else {
      console.log("No 'users' collection found");
    }

    if (reviewsExists) {
      const r = await db.collection("reviews").deleteMany({});
      console.log(`Deleted reviews: ${r.deletedCount ?? 0}`);
    } else {
      console.log("No 'reviews' collection found");
    }
  } catch (err) {
    console.error("Wipe failed:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

wipe();