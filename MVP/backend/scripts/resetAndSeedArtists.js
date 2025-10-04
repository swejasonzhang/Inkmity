import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import Message from "../models/Message.js";

const NODE_ENV = process.env.NODE_ENV || "development";
const candidates = [
  `../.env.${NODE_ENV}`,
  NODE_ENV.startsWith("dev.")
    ? `../.env.${NODE_ENV.replace(/^dev\./, "")}`
    : null,
  "../.env.development",
  "../.env",
].filter(Boolean);

let dotenvLoaded = false;
for (const p of candidates) {
  const { error } = dotenv.config({
    path: new URL(p, import.meta.url).pathname,
  });
  if (!error) {
    dotenvLoaded = true;
    console.log(`[dotenv] loaded ${p}`);
    break;
  }
}
if (!dotenvLoaded) {
  console.warn("[dotenv] no .env file found from candidates:", candidates);
}

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO) {
  throw new Error(
    "MONGO_URI not set. Add it to one of your env files (e.g. .env.development) or export it in the shell."
  );
}

const COUNT = 50;

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

const randomPriceRange = () => {
  const min = Math.floor(Math.random() * 400) + 100;
  const max = min + Math.floor(Math.random() * 1500) + 300;
  return { min, max };
};

const avatarFor = (seed) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
    seed
  )}&radius=50`;

const portfolioFor = (seed) => [
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-1/1200/900`,
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-2/1200/900`,
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-3/1200/900`,
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-4/1200/900`,
];

(async () => {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB");

    const userDel = await User.deleteMany({});
    const msgDel = await Message.deleteMany({});
    console.log(
      `🗑️  Removed users: ${userDel.deletedCount ?? 0}, messages: ${
        msgDel.deletedCount ?? 0
      }`
    );

    const artists = Array.from({ length: COUNT }).map((_, i) => {
      const username = `artist${i + 1}`;
      const location = pick(locations);
      const chosenStyles = Array.from(
        new Set([pick(styles), pick(styles), pick(styles)])
      ).slice(0, 3);

      return {
        clerkId: uuidv4(),
        username,
        email: `${username}@example.com`,
        role: "artist",
        location,
        style: chosenStyles,
        bio: `Tattoo artist focused on ${chosenStyles.join(
          ", "
        )} in ${location}.`,
        priceRange: randomPriceRange(),
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        reviews: [],
        reviewsCount: Math.floor(Math.random() * 120),
        profileImage: avatarFor(username),
        images: portfolioFor(username),
        socialLinks: [
          { platform: "instagram", url: `https://instagram.com/${username}` },
          { platform: "website", url: `https://example.com/${username}` },
        ],
      };
    });

    await User.insertMany(artists, { ordered: true });
    console.log(`✅ Seeded ${artists.length} artists`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during reset/seed:", err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
})();
