import "../loadEnv.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import "../models/UserBase.js";
import "../models/Artist.js";
import "../models/Client.js";
import Review from "../models/Review.js";

const REVIEWERS = [
  { handle: "mock_rev_marisa", username: "Marisa K." },
  { handle: "mock_rev_devon", username: "Devon L." },
  { handle: "mock_rev_priya", username: "Priya S." },
  { handle: "mock_rev_theo", username: "Theo R." },
  { handle: "mock_rev_jade", username: "Jade W." },
  { handle: "mock_rev_omar", username: "Omar B." },
];

const REVIEWS = [
  { rating: 5, comment: "Kenji's linework is unreal. My koi sleeve came out cleaner than I imagined — he nailed the flow around the elbow. Worth every minute." },
  { rating: 5, comment: "Booked a dragon back piece over three sessions. Calm, precise, and the color saturation is incredible. Healed perfectly with zero patchiness." },
  { rating: 4, comment: "Beautiful traditional work and a super professional studio. Wait was a little long to get in, but the result speaks for itself." },
  { rating: 5, comment: "He really listens. I came in with a rough idea and he refined it into something way better while keeping it true to the style. Highly recommend." },
  { rating: 5, comment: "Second piece with Kenji. Consistent, detailed, and the shading is so smooth. The consultation alone was worth it." },
  { rating: 4, comment: "Stunning irezumi-style chest piece. A bit pricey but you're paying for mastery. Aftercare instructions were clear and it healed great." },
];

async function run() {
  await connectDB();
  const Artist = mongoose.model("artist");
  const Client = mongoose.model("client");

  const kenji = await Artist.findOne({ handle: "kenji.mori" });
  if (!kenji) {
    console.error("Kenji (handle kenji.mori) not found. Run seedMockArtists.js first.");
    await disconnectDB();
    process.exit(1);
  }

  const reviewerDocs = [];
  for (const r of REVIEWERS) {
    let doc = await Client.findOne({ handle: r.handle });
    if (!doc) {
      doc = await Client.create({
        clerkId: r.handle,
        email: `${r.handle}@mock.inkmity.dev`,
        username: r.username,
        handle: r.handle,
        role: "client",
        onboardingComplete: true,
        visible: true,
      });
    }
    reviewerDocs.push(doc);
  }

  await Review.deleteMany({ artist: kenji._id, reviewer: { $in: reviewerDocs.map((d) => d._id) } });

  const now = Date.now();
  const created = [];
  for (let i = 0; i < REVIEWS.length; i++) {
    const reviewer = reviewerDocs[i % reviewerDocs.length];
    const r = await Review.create({
      reviewer: reviewer._id,
      artist: kenji._id,
      rating: REVIEWS[i].rating,
      comment: REVIEWS[i].comment,
      createdAt: new Date(now - i * 11 * 24 * 60 * 60 * 1000),
    });
    created.push(r);
  }

  const allReviews = await Review.find({ artist: kenji._id });
  const avg = allReviews.reduce((a, r) => a + (r.rating || 0), 0) / (allReviews.length || 1);
  kenji.reviews = allReviews.map((r) => r._id);
  kenji.reviewsCount = allReviews.length;
  kenji.rating = Math.round(avg * 10) / 10;
  await kenji.save();

  console.log(`Seeded ${created.length} reviews for Kenji Mori. Total=${allReviews.length}, avg=${kenji.rating}`);
  await disconnectDB();
}

run().catch(async (err) => {
  console.error("Seed failed:", err);
  await disconnectDB();
  process.exit(1);
});
