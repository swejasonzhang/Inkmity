import mongoose from "mongoose";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Availability from "../models/Availability.js";
import Studio from "../models/Studio.js";
import StudioMembership from "../models/StudioMembership.js";
import ArtworkLike from "../models/ArtworkLike.js";

const ALLOWED_DB = "inkmity_dev";
const ARTIST_COUNT = 60;
const img = (seed) => `https://picsum.photos/seed/${seed}/640/640`;
const works = (prefix, n) => Array.from({ length: n }, (_, i) => img(`${prefix}${i + 1}`));
const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

const STYLES = [
  "blackwork", "fine line", "traditional", "neo-traditional", "japanese",
  "realism", "black and grey", "lettering", "watercolor", "geometric",
];
const FIRST = ["Mara", "Diego", "Yuki", "Nadia", "Theo", "Ines", "Marcus", "Lena", "Priya", "Sam", "Camila", "Owen", "Hana", "Eli", "Sofia", "Ravi", "Greta", "Kofi", "Bianca", "Jonah", "Mei", "Tomas", "Aria", "Dax", "Noa", "Felix", "Zara", "Idris", "Maya", "Luca"];
const LAST = ["Voss", "Salas", "Tanaka", "Petrova", "Marsh", "Costa", "Reed", "Hoff", "Anand", "Okoro", "Rojas", "Pike", "Kim", "Brandt", "Marin", "Mehta", "Lund", "Mensah", "Ferro", "Vidic"];
const CITIES = ["New York, NY", "Los Angeles, CA", "San Francisco, CA", "Chicago, IL", "Austin, TX", "Miami, FL", "Brooklyn, NY", "Seattle, WA", "Portland, OR", "Denver, CO"];
const STUDIOS = ["Ironline Studio", "Goldenwest Tattoo", "Kintsugi Ink", "Greyscale Co.", "Sol Collective", "Lone Star Ink", "Cascade Tattoo", "Fineline NYC"];

const REVIEW_COMMENTS = [
  "Incredible linework — exactly the vision I had. Healed perfectly.",
  "So professional, calm, and the detail is unreal. Booking again.",
  "Worth every minute. The piece looks better than the reference.",
  "Clean studio, gentle hand, and a true artist. Highly recommend.",
  "Took my rough idea and made it sing. Couldn't be happier.",
  "Best tattoo experience I've had. The shading is flawless.",
];

function makeStylePicker() {
  const counts = Object.fromEntries(STYLES.map((s) => [s, 0]));
  return () => {
    const chosen = [...STYLES].sort((a, b) => counts[a] - counts[b]).slice(0, 3);
    chosen.forEach((s) => (counts[s] += 1));
    return chosen;
  };
}

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

  const oldArtists = await User.find({ clerkId: /^seed_artist_/ }, { _id: 1 });
  await Review.deleteMany({ $or: [{ reviewer: client._id }, { artist: { $in: oldArtists.map((a) => a._id) } }] });
  await Booking.deleteMany({ artistId: /^seed_artist_/ });
  await Availability.deleteMany({ artistId: /^seed_artist_/ });
  await StudioMembership.deleteMany({ artistClerkId: /^seed_artist_/ });
  await Studio.deleteMany({ slug: /^seed-studio-/ });
  await ArtworkLike.deleteMany({ $or: [{ artistClerkId: /^seed_artist_/ }, { userClerkId: /^seed_liker_/ }] });
  const removed = await User.deleteMany({ clerkId: /^seed_artist_/ });
  if (removed.deletedCount) console.log(`Cleared ${removed.deletedCount} old demo artist(s) + related data.`);

  const pickStyles = makeStylePicker();
  const docs = [];
  const meta = [];
  for (let i = 0; i < ARTIST_COUNT; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
    const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "") + i;
    const styles = pickStyles();
    const studio = i % 3 === 0 ? null : pick(STUDIOS, i);
    const years = 4 + (i % 16);
    const rating = Math.round((4.5 + (i % 6) * 0.1) * 10) / 10;
    const reviews = 30 + ((i * 13) % 280);
    const rate = [120 + (i % 8) * 20, 380 + (i % 10) * 70];
    const city = pick(CITIES, i);
    meta.push({ name, city, studio, styles, years, rating, rate });
    docs.push({
      clerkId: `seed_artist_${i + 1}`,
      email: `demo.artist${i + 1}@inkmity.dev`,
      username: name,
      handle: `@${handle}`,
      role: "artist",
      onboardingComplete: true,
      visible: true,
      location: city,
      shop: studio || undefined,
      bio: `${styles.join(" & ")} specialist${studio ? ` at ${studio}` : ""}. ${years}+ years.`,
      styles,
      yearsExperience: years,
      rating,
      reviewsCount: reviews,
      baseRate: rate[0],
      baseRateMax: rate[1],
      bookingPreference: "open",
      travelFrequency: "rare",
      verified: true,
      verifiedAt: new Date(),
      portfolioImages: works(`${handle}p`, 8),
      pastWorks: works(`${handle}a`, 5),
      healedWorks: works(`${handle}h`, 3),
      sketches: works(`${handle}s`, 4),
    });
  }
  const created = await Artist.insertMany(docs);
  console.log(`Created ${created.length} artists.`);

  const reviewDocs = [];
  created.forEach((doc, idx) => {
    const n = 3 + (idx % 3);
    for (let r = 0; r < n; r++) {
      reviewDocs.push({
        reviewer: client._id,
        artist: doc._id,
        rating: Math.min(5, Math.round(meta[idx].rating)),
        comment: pick(REVIEW_COMMENTS, r + idx),
        recommend: true,
        createdAt: new Date(Date.now() - (r + 1) * 7 * 86400000),
      });
    }
  });
  await Review.insertMany(reviewDocs);
  console.log(`Created ${reviewDocs.length} reviews.`);

  const likeDocs = [];
  let popIdx = 0;
  for (const doc of created.slice(0, 24)) {
    const featured = (doc.portfolioImages || []).slice(0, 2);
    for (const url of featured) {
      const n = Math.max(1, 40 - popIdx * 2);
      for (let l = 0; l < n; l++) {
        likeDocs.push({ userClerkId: `seed_liker_${l + 1}`, artistClerkId: doc.clerkId, imageUrl: url });
      }
      popIdx += 1;
    }
  }
  likeDocs.push(...(created[0]?.portfolioImages || []).slice(0, 2).map((url) => ({ userClerkId: client.clerkId, artistClerkId: created[0].clerkId, imageUrl: url })));
  await ArtworkLike.insertMany(likeDocs, { ordered: false }).catch(() => {});
  console.log(`Created ${likeDocs.length} artwork likes.`);

  const STATUSES = ["pending", "accepted", "completed", "denied", "cancelled", "completed", "accepted"];
  const TYPES = ["consultation", "tattoo_session"];
  const bookingDocs = [];
  for (let b = 0; b < 18; b++) {
    const doc = created[b % created.length];
    const m = meta[b % meta.length];
    const status = pick(STATUSES, b);
    const past = status === "completed" || status === "cancelled" || status === "denied";
    const start = new Date(Date.now() + (past ? -1 : 1) * (b + 2) * 86400000);
    const price = (m.rate[0] + b * 25) * 100;
    bookingDocs.push({
      artistId: doc.clerkId,
      clientId: client.clerkId,
      appointmentType: pick(TYPES, b),
      startAt: start,
      endAt: new Date(start.getTime() + 90 * 60000),
      status,
      location: m.city,
      priceCents: status === "completed" ? price : 0,
      ...(status === "completed" ? { balancePaidCents: price, balanceCapturedAt: new Date(start.getTime() + 90 * 60000) } : {}),
      ...(status === "cancelled" ? { cancelledAt: start, cancelledBy: "client" } : {}),
    });
  }
  await Booking.insertMany(bookingDocs);
  console.log(`Created ${bookingDocs.length} bookings.`);

  const hours = [{ start: "10:00", end: "18:00" }];
  const weekly = { sun: [], mon: hours, tue: hours, wed: hours, thu: hours, fri: hours, sat: [{ start: "11:00", end: "16:00" }] };
  await Availability.insertMany(created.map((doc) => ({ artistId: doc.clerkId, slotMinutes: 60, weekly })));
  console.log(`Created availability for ${created.length} artists.`);

  const studioName = new Map();
  created.forEach((doc, idx) => { if (meta[idx].studio) studioName.set(doc.clerkId, meta[idx].studio); });
  const names = [...new Set([...studioName.values()])];
  const studioId = new Map();
  let si = 0;
  for (const name of names) {
    si += 1;
    const ownerClerk = [...studioName.entries()].find(([, n]) => n === name)[0];
    const owner = created.find((d) => d.clerkId === ownerClerk);
    const ownerMeta = meta[created.indexOf(owner)];
    const studio = await Studio.create({ name, ownerClerkId: ownerClerk, slug: `seed-studio-${si}`, city: ownerMeta.city, bio: `${name} — a collective of resident artists.`, active: true });
    studioId.set(name, studio._id);
  }
  const memberships = [...studioName.entries()].map(([clerkId, name]) => ({ studioId: studioId.get(name), artistClerkId: clerkId, status: "active", commissionPct: 0.3 }));
  await StudioMembership.insertMany(memberships);
  console.log(`Created ${names.length} studios + ${memberships.length} memberships.`);

  await Artist.updateOne(
    { username: "testartist" },
    { $set: { styles: ["traditional", "blackwork", "fine line"], portfolioImages: works("testartistp", 8), pastWorks: works("testartista", 5), healedWorks: works("testartisth", 3), sketches: works("testartists", 4), rating: 4.8, reviewsCount: 40, visible: true, verified: true, verifiedAt: new Date() } }
  );

  const counts = {};
  meta.forEach((m) => m.styles.forEach((s) => (counts[s] = (counts[s] || 0) + 1)));
  console.log("\nArtists per style:");
  Object.entries(counts).sort().forEach(([s, c]) => console.log(`  ${s}: ${c}`));

  await mongoose.disconnect();
  console.log(`\nDone. ${created.length} artists, ${reviewDocs.length} reviews, ${bookingDocs.length} bookings, ${names.length} studios.`);
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
