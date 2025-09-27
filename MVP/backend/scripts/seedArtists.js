import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../backend/models/User.js";

dotenv.config({ path: "../.env" });

const locations = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Miami",
  "Dallas",
  "Seattle",
  "Boston",
  "San Francisco",
  "Austin",
  "Portland",
];

const styles = [
  "Traditional",
  "Realism",
  "Japanese",
  "Watercolor",
  "Blackwork",
  "Geometric",
  "Portrait",
  "Fine Line",
  "Neo-Traditional",
  "Abstract",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const priceRange = () => {
  const min = Math.floor(Math.random() * 400) + 100;
  const max = min + Math.floor(Math.random() * 1500) + 300;
  return { min, max };
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await User.deleteMany({ role: "artist" });
    console.log("🗑️  Removed existing artists");

    const artists = Array.from({ length: 5 }).map((_, i) => {
      const clerkId = uuidv4();
      console.log(`🎨 Creating artist${i + 1} with clerkId: ${clerkId}`);
      return {
        clerkId,
        username: `artist${i + 1}`,
        email: `artist${i + 1}@example.com`,
        role: "artist",
        location: pick(locations),
        style: [pick(styles), pick(styles)].filter(
          (v, idx, a) => a.indexOf(v) === idx
        ),
        bio: `Tattoo artist focused on ${pick(styles)} in ${pick(locations)}.`,
        priceRange: priceRange(),
        rating: 0,
        reviews: [],
      };
    });

    await User.insertMany(artists, { ordered: true });
    console.log("✅ Seeded 5 artists");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding users:", err);
    process.exit(1);
  }
})();