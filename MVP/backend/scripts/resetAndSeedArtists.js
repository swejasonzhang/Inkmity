import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import Review from "../models/Review.js";

const ARTIST_COUNT = 50;
const CLIENT_COUNT = 120;

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

const reviewPhrases = [
  "Super professional and friendly.",
  "Linework is crisp and healed beautifully.",
  "Captured my idea perfectly.",
  "Great communication and a clean studio.",
  "Color saturation is insane.",
  "Thoughtful placement advice.",
  "Quick but meticulous.",
  "Laid-back vibe, top-tier artistry.",
  "Helped refine my concept.",
  "Would definitely book again.",
  "Exceeded my expectations.",
  "Pain management tips were helpful.",
  "Attention to detail is unmatched.",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const round1 = (n) => Math.round(n * 10) / 10;

const randomPriceRange = () => {
  const min = Math.floor(Math.random() * 400) + 100;
  const max = min + Math.floor(Math.random() * 1500) + 300;
  return { min, max };
};

const avatarFor = (seed) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
    seed
  )}&radius=50`;

const randomPastDate = (daysBack = 540) => {
  const now = Date.now();
  const delta = randint(1, daysBack) * 24 * 60 * 60 * 1000;
  return new Date(now - delta);
};

const randomAvailability = () => {
  const isAvailableNow = Math.random() < 0.35;
  const isClosed = !isAvailableNow && Math.random() < 0.1;
  const acceptingWaitlist = !isAvailableNow && !isClosed && Math.random() < 0.3;
  let nextAvailableDate = null;
  if (!isAvailableNow && !isClosed) {
    const days = randint(3, 180);
    nextAvailableDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  return { isAvailableNow, nextAvailableDate, acceptingWaitlist, isClosed };
};

const loadEnv = () => {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const candidates = [
    `../.env.${NODE_ENV}`,
    NODE_ENV.startsWith("dev.")
      ? `../.env.${NODE_ENV.replace(/^dev\./, "")}`
      : null,
    "../.env.development",
    "../.env",
  ].filter(Boolean);
  for (const p of candidates) {
    const { error } = dotenv.config({
      path: new URL(p, import.meta.url).pathname,
    });
    if (!error) {
      console.log(`[dotenv] loaded ${p}`);
      return;
    }
  }
  console.warn("[dotenv] no .env file found");
};

const getMongoUri = () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI not set.");
  return uri;
};

const connectDB = async (uri) => {
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log("🔌 Disconnected");
};

const clearCollections = async () => {
  const delUsers = await User.deleteMany({});
  const delReviews = await Review.deleteMany({});
  console.log(
    `🗑️  Cleared users: ${delUsers.deletedCount ?? 0}, reviews: ${
      delReviews.deletedCount ?? 0
    }`
  );
};

const createClients = async (count) => {
  const payload = Array.from({ length: count }).map((_, i) => {
    const username = `client${i + 1}`;
    return {
      clerkId: uuidv4(),
      username,
      email: `${username}@example.com`,
      role: "client",
      location: pick(locations),
      avatar: { url: avatarFor(username), alt: "Profile photo" },
    };
  });
  const inserted = await User.insertMany(payload, { ordered: true });
  console.log(`👥 Seeded ${inserted.length} clients`);
  return inserted.map((c) => c._id);
};

const createArtists = async (count) => {
  const payload = Array.from({ length: count }).map((_, i) => {
    const username = `artist${i + 1}`;
    const location = pick(locations);
    const chosenStyles = Array.from(
      new Set([pick(styles), pick(styles), pick(styles)])
    ).slice(0, 3);
    const { isAvailableNow, nextAvailableDate, acceptingWaitlist, isClosed } =
      randomAvailability();
    const yearsExperience = randint(0, 20);
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
      rating: 0,
      reviews: [],
      reviewsCount: 0,
      avatar: { url: avatarFor(username), alt: "Profile photo" },
      yearsExperience,
      isAvailableNow,
      nextAvailableDate,
      acceptingWaitlist,
      isClosed,
    };
  });
  const inserted = await User.insertMany(payload, { ordered: true });
  console.log(`🎨 Seeded ${inserted.length} artists`);
  return inserted;
};

const genReviewDocs = (artistId, artistLocation, artistStyles, clientIds) => {
  const n = randint(6, 24);
  const docs = Array.from({ length: n }).map(() => {
    const base = 4.4 + (Math.random() - 0.5) * 0.9;
    const rating = clamp(Math.round(base * 2) / 2, 3, 5);
    const phrase = pick(reviewPhrases);
    const tail = pick([
      `style: ${pick(artistStyles)}`,
      `in ${artistLocation}`,
      "custom design",
      "touch-up plan",
      "aftercare guidance",
    ]);
    const reviewer = pick(clientIds);
    return {
      reviewer,
      artist: artistId,
      rating,
      comment: `${phrase} Loved the ${tail}.`,
      createdAt: randomPastDate(),
    };
  });
  const avg = round1(docs.reduce((s, d) => s + d.rating, 0) / n);
  return { docs, avg };
};

const attachReviewsAndUpdateArtists = async (artists, clientIds) => {
  const bulkUserUpdates = [];
  for (const artist of artists) {
    const { docs, avg } = genReviewDocs(
      artist._id,
      artist.location,
      artist.style,
      clientIds
    );
    for (const d of docs)
      if (d.createdAt > new Date()) d.createdAt = new Date();
    const created = await Review.insertMany(docs, { ordered: true });
    const reviewIds = created.map((r) => r._id);
    bulkUserUpdates.push({
      updateOne: {
        filter: { _id: artist._id },
        update: {
          $set: { rating: avg, reviewsCount: reviewIds.length },
          $push: { reviews: { $each: reviewIds } },
        },
      },
    });
  }
  if (bulkUserUpdates.length) await User.bulkWrite(bulkUserUpdates);
  console.log("✅ Linked reviews to artists and updated ratings");
};

const main = async () => {
  try {
    loadEnv();
    const uri = getMongoUri();
    await connectDB(uri);
    await clearCollections();
    const clientIds = await createClients(CLIENT_COUNT);
    const artists = await createArtists(ARTIST_COUNT);
    await attachReviewsAndUpdateArtists(artists, clientIds);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during reset/seed:", err);
    try {
      await disconnectDB();
    } catch {}
    process.exit(1);
  }
};

main();