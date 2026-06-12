// Dev-only: populate the dev DB end-to-end so every surface looks full —
// demo artists (with portfolios), reviews, and bookings. Mongo-only fixtures
// (no Clerk users); they display/search/group and give reviews + appointments
// real data. Idempotent: clears prior seed fixtures and re-inserts.
//
//   node --env-file=.env.development scripts/seedDemoArtists.js
//
// Safe: refuses to run against anything but the inkmity_dev database.
import mongoose from "mongoose";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import Studio from "../models/Studio.js";
import StudioMembership from "../models/StudioMembership.js";

const ALLOWED_DB = "inkmity_dev";
const img = (seed) => `https://picsum.photos/seed/${seed}/640/640`;
const works = (prefix, n) => Array.from({ length: n }, (_, i) => img(`${prefix}${i + 1}`));
const pick = (arr, i) => arr[i % arr.length];

// ~24 artists, 2–5 per style so each carousel feels full.
const DEMO_ARTISTS = [
  { username: "Mara Voss", city: "New York, NY", studio: "Ironline Studio", styles: ["blackwork", "fine line"], years: 9, rating: 4.9, reviews: 128, rate: [180, 600] },
  { username: "Diego Salas", city: "Los Angeles, CA", studio: "Goldenwest Tattoo", styles: ["traditional", "neo-traditional"], years: 12, rating: 4.8, reviews: 211, rate: [160, 500] },
  { username: "Yuki Tanaka", city: "San Francisco, CA", studio: "Kintsugi Ink", styles: ["japanese", "blackwork"], years: 15, rating: 5.0, reviews: 96, rate: [220, 900] },
  { username: "Nadia Petrova", city: "Chicago, IL", studio: "Greyscale Co.", styles: ["realism", "black and grey"], years: 8, rating: 4.7, reviews: 74, rate: [200, 700] },
  { username: "Theo Marsh", city: "Austin, TX", styles: ["fine line", "lettering"], years: 6, rating: 4.8, reviews: 53, rate: [120, 380] },
  { username: "Ines Costa", city: "Miami, FL", studio: "Sol Collective", styles: ["watercolor", "neo-traditional"], years: 7, rating: 4.6, reviews: 61, rate: [150, 450] },
  { username: "Marcus Reed", city: "Brooklyn, NY", studio: "Ironline Studio", styles: ["geometric", "blackwork"], years: 10, rating: 4.9, reviews: 142, rate: [170, 520] },
  { username: "Lena Hoff", city: "Seattle, WA", styles: ["traditional", "lettering"], years: 11, rating: 4.7, reviews: 88, rate: [140, 420] },
  { username: "Priya Anand", city: "New York, NY", studio: "Fineline NYC", styles: ["fine line", "geometric"], years: 5, rating: 4.8, reviews: 47, rate: [130, 360] },
  { username: "Sam Okoro", city: "Los Angeles, CA", studio: "Goldenwest Tattoo", styles: ["realism", "japanese"], years: 13, rating: 4.9, reviews: 175, rate: [210, 800] },
  { username: "Camila Rojas", city: "Miami, FL", styles: ["fine line", "watercolor"], years: 6, rating: 4.7, reviews: 64, rate: [140, 400] },
  { username: "Owen Pike", city: "Austin, TX", studio: "Lone Star Ink", styles: ["traditional", "blackwork"], years: 14, rating: 4.8, reviews: 152, rate: [160, 480] },
  { username: "Hana Kim", city: "San Francisco, CA", studio: "Kintsugi Ink", styles: ["fine line", "micro realism"], years: 7, rating: 4.9, reviews: 91, rate: [180, 520] },
  { username: "Eli Brandt", city: "Chicago, IL", studio: "Greyscale Co.", styles: ["black and grey", "realism"], years: 16, rating: 5.0, reviews: 240, rate: [240, 950] },
  { username: "Sofia Marin", city: "New York, NY", styles: ["neo-traditional", "geometric"], years: 8, rating: 4.6, reviews: 58, rate: [170, 540] },
  { username: "Ravi Mehta", city: "Seattle, WA", studio: "Cascade Tattoo", styles: ["blackwork", "geometric"], years: 9, rating: 4.7, reviews: 80, rate: [160, 470] },
  { username: "Greta Lund", city: "Brooklyn, NY", studio: "Fineline NYC", styles: ["fine line", "lettering"], years: 6, rating: 4.8, reviews: 69, rate: [130, 390] },
  { username: "Kofi Mensah", city: "Los Angeles, CA", styles: ["traditional", "japanese"], years: 12, rating: 4.7, reviews: 110, rate: [180, 620] },
  { username: "Bianca Ferro", city: "Miami, FL", studio: "Sol Collective", styles: ["watercolor", "realism"], years: 10, rating: 4.8, reviews: 133, rate: [190, 660] },
  { username: "Jonah Albright", city: "Austin, TX", studio: "Lone Star Ink", styles: ["lettering", "blackwork"], years: 7, rating: 4.6, reviews: 51, rate: [120, 350] },
  { username: "Mei Chen", city: "San Francisco, CA", styles: ["japanese", "neo-traditional"], years: 18, rating: 5.0, reviews: 305, rate: [260, 1100] },
  { username: "Tomas Vidic", city: "Chicago, IL", studio: "Greyscale Co.", styles: ["black and grey", "geometric"], years: 11, rating: 4.7, reviews: 97, rate: [180, 560] },
  { username: "Aria Bloom", city: "Seattle, WA", studio: "Cascade Tattoo", styles: ["watercolor", "fine line"], years: 5, rating: 4.8, reviews: 44, rate: [130, 370] },
  { username: "Dax Romero", city: "New York, NY", studio: "Ironline Studio", styles: ["realism", "neo-traditional"], years: 14, rating: 4.9, reviews: 198, rate: [220, 820] },
];

const REVIEW_COMMENTS = [
  "Incredible linework — exactly the vision I had. Healed perfectly.",
  "So professional, calm, and the detail is unreal. Booking again.",
  "Worth every minute. The piece looks better than the reference.",
  "Clean studio, gentle hand, and a true artist. Highly recommend.",
  "Took my rough idea and made it sing. Couldn't be happier.",
  "Best tattoo experience I've had. The shading is flawless.",
];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set (pass --env-file=.env.development).");
  await mongoose.connect(uri);
  if (mongoose.connection.name !== ALLOWED_DB) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run against "${mongoose.connection.name}". Expected "${ALLOWED_DB}".`);
  }
  console.log(`Connected to ${mongoose.connection.name}.`);

  const Artist = mongoose.model("artist");
  const client = await User.findOne({ username: "testclient" });
  if (!client) throw new Error("testclient not found — run seedTestAuthUsers.js first.");

  // Clear prior fixtures.
  const oldArtists = await User.find({ clerkId: /^seed_artist_/ }, { _id: 1, clerkId: 1 });
  const oldIds = oldArtists.map((a) => a._id);
  await Review.deleteMany({ $or: [{ reviewer: client._id }, { artist: { $in: oldIds } }] });
  await Booking.deleteMany({ artistId: /^seed_artist_/ });
  const removed = await User.deleteMany({ clerkId: /^seed_artist_/ });
  if (removed.deletedCount) console.log(`Cleared ${removed.deletedCount} old demo artist(s) + their reviews/bookings.`);

  const created = [];
  let i = 0;
  for (const a of DEMO_ARTISTS) {
    i += 1;
    const handle = a.username.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const doc = await Artist.create({
      clerkId: `seed_artist_${i}`,
      email: `demo.artist${i}@inkmity.dev`,
      username: a.username,
      handle: `@${handle}`,
      role: "artist",
      onboardingComplete: true,
      visible: true,
      location: a.city,
      shop: a.studio || undefined,
      bio: `${a.styles.join(" & ")} specialist${a.studio ? ` at ${a.studio}` : ""}. ${a.years}+ years.`,
      styles: a.styles,
      yearsExperience: a.years,
      rating: a.rating,
      reviewsCount: a.reviews,
      baseRate: a.rate[0],
      baseRateMax: a.rate[1],
      bookingPreference: "open",
      travelFrequency: "rare",
      portfolioImages: works(`${handle}p`, 8),
      healedWorks: works(`${handle}h`, 3),
    });
    created.push({ doc, meta: a });
  }
  console.log(`Created ${created.length} demo artists.`);

  // Reviews — a few per artist, from the test client.
  let reviewCount = 0;
  for (const { doc, meta } of created) {
    const n = 3 + (meta.reviews % 3);
    for (let r = 0; r < n; r++) {
      await Review.create({
        reviewer: client._id,
        artist: doc._id,
        rating: Math.min(5, Math.round(meta.rating)),
        comment: pick(REVIEW_COMMENTS, r + meta.years),
        recommend: true,
        createdAt: new Date(Date.now() - (r + 1) * 7 * 86400000),
      });
      reviewCount++;
    }
  }
  console.log(`Created ${reviewCount} reviews.`);

  // Bookings — a spread of statuses across the first artists, end-to-end.
  const STATUSES = ["pending", "accepted", "completed", "denied", "cancelled", "completed", "accepted"];
  const TYPES = ["consultation", "tattoo_session"];
  let bookingCount = 0;
  for (let b = 0; b < 14; b++) {
    const { doc, meta } = created[b % created.length];
    const status = pick(STATUSES, b);
    const past = status === "completed" || status === "cancelled" || status === "denied";
    const start = new Date(Date.now() + (past ? -1 : 1) * (b + 2) * 86400000);
    const end = new Date(start.getTime() + 90 * 60000);
    const price = (meta.rate[0] + b * 25) * 100;
    await Booking.create({
      artistId: doc.clerkId,
      clientId: client.clerkId,
      appointmentType: pick(TYPES, b),
      startAt: start,
      endAt: end,
      status,
      location: meta.city,
      priceCents: status === "completed" ? price : 0,
      ...(status === "completed" ? { balancePaidCents: price, balanceCapturedAt: new Date(start.getTime() + 90 * 60000) } : {}),
      ...(status === "cancelled" ? { cancelledAt: start, cancelledBy: "client" } : {}),
    });
    bookingCount++;
  }
  console.log(`Created ${bookingCount} bookings.`);

  // Availability — weekday hours so the demo artists are bookable.
  await Availability.deleteMany({ artistId: /^seed_artist_/ });
  const hours = [{ start: "10:00", end: "18:00" }];
  const weekly = { sun: [], mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: [{ start: "11:00", end: "16:00" }] };
  for (const { doc } of created) {
    await Availability.create({ artistId: doc.clerkId, slotMinutes: 60, weekly });
  }
  console.log(`Created availability for ${created.length} artists.`);

  // Studios + memberships for the studio-affiliated artists.
  await StudioMembership.deleteMany({ artistClerkId: /^seed_artist_/ });
  await Studio.deleteMany({ slug: /^seed-studio-/ });
  const studioNames = [...new Set(created.filter((c) => c.meta.studio).map((c) => c.meta.studio))];
  const studioId = new Map();
  let si = 0;
  for (const name of studioNames) {
    si += 1;
    const owner = created.find((c) => c.meta.studio === name);
    const studio = await Studio.create({
      name,
      ownerClerkId: owner.doc.clerkId,
      slug: `seed-studio-${si}`,
      city: owner.meta.city,
      bio: `${name} — a collective of resident artists.`,
      active: true,
    });
    studioId.set(name, studio._id);
  }
  let memberCount = 0;
  for (const { doc, meta } of created) {
    if (!meta.studio) continue;
    await StudioMembership.create({
      studioId: studioId.get(meta.studio),
      artistClerkId: doc.clerkId,
      status: "active",
      commissionPct: 0.3,
    });
    memberCount += 1;
  }
  console.log(`Created ${studioNames.length} studios + ${memberCount} memberships.`);

  // Give the login test artist a portfolio too.
  await Artist.updateOne(
    { username: "testartist" },
    {
      $set: {
        styles: ["traditional", "blackwork", "fine line"],
        portfolioImages: works("testartistp", 8),
        healedWorks: works("testartisth", 3),
        rating: 4.8,
        reviewsCount: 40,
        visible: true,
      },
    }
  );

  await mongoose.disconnect();
  console.log(`\nDone. ${created.length} artists, ${reviewCount} reviews, ${bookingCount} bookings, ${studioNames.length} studios.`);
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
