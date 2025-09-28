import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import Message from "../models/Message.js";

dotenv.config({ path: "../.env" });

const COUNT = 5;

const locations = ["New York","Los Angeles","Chicago","Miami","Dallas","Seattle","Boston","San Francisco","Austin","Portland"];
const styles = ["Traditional","Realism","Japanese","Watercolor","Blackwork","Geometric","Portrait","Fine Line","Neo-Traditional","Abstract"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const priceRange = () => {
  const min = Math.floor(Math.random() * 400) + 100;
  const max = min + Math.floor(Math.random() * 1500) + 300;
  return { min, max };
};

const avatarFor = (seed) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&radius=50`;

(async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set in .env");

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const userDel = await User.deleteMany({});
    const msgDel = await Message.deleteMany({});
    console.log(`🗑️  Removed users: ${userDel.deletedCount}, messages: ${msgDel.deletedCount}`);

    const artists = Array.from({ length: COUNT }).map((_, i) => {
      const username = `artist${i + 1}`;
      return {
        clerkId: uuidv4(),
        username,
        email: `${username}@example.com`,
        role: "artist",
        location: pick(locations),
        style: Array.from(new Set([pick(styles), pick(styles)])),
        bio: `Tattoo artist focused on ${pick(styles)} in ${pick(locations)}.`,
        priceRange: priceRange(),
        rating: 0,
        reviews: [],
        profileImage: avatarFor(username),
        images: [
          `https://picsum.photos/seed/${username}-1/800/600`,
          `https://picsum.photos/seed/${username}-2/800/600`,
        ],
      };
    });

    await User.insertMany(artists, { ordered: true });
    console.log(`✅ Seeded ${COUNT} artists`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error during reset/seed:", err);
    process.exit(1);
  }
})();