import "../loadEnv.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import "../models/UserBase.js";
import "../models/Artist.js";

const IMG = (seed) => `https://picsum.photos/seed/${seed}/800/800`;

const MOCK = [
  {
    clerkId: "mock_artist_ink_rae",
    email: "rae@mock.inkmity.dev",
    username: "Rae Vasquez",
    handle: "rae.vasquez",
    location: "Brooklyn, NY",
    bio: "Fine-line botanical and blackwork. Soft, delicate compositions that grow with you.",
    styles: ["fine-line", "blackwork", "botanical"],
    yearsExperience: 7,
    baseRate: 180,
    bookingPreference: "open",
    travelFrequency: "rare",
    rating: 4.8,
    reviewsCount: 64,
    bookingsCount: 210,
    shop: "Wildflower Tattoo",
    seed: "rae",
  },
  {
    clerkId: "mock_artist_kenji",
    email: "kenji@mock.inkmity.dev",
    username: "Kenji Mori",
    handle: "kenji.mori",
    location: "Los Angeles, CA",
    bio: "Japanese traditional (irezumi) — dragons, koi, and full-body work rooted in classic technique.",
    styles: ["japanese", "traditional", "color"],
    yearsExperience: 14,
    baseRate: 250,
    bookingPreference: "waitlist",
    travelFrequency: "sometimes",
    rating: 4.9,
    reviewsCount: 132,
    bookingsCount: 540,
    shop: "Rising Sun Ink",
    seed: "kenji",
  },
  {
    clerkId: "mock_artist_mara",
    email: "mara@mock.inkmity.dev",
    username: "Mara Solis",
    handle: "mara.solis",
    location: "Austin, TX",
    bio: "Bold neo-traditional with saturated color and clean linework. Animals, florals, and folklore.",
    styles: ["neo-traditional", "color", "illustrative"],
    yearsExperience: 9,
    baseRate: 200,
    bookingPreference: "open",
    travelFrequency: "often",
    rating: 4.7,
    reviewsCount: 88,
    bookingsCount: 305,
    shop: "Lone Star Electric",
    seed: "mara",
  },
  {
    clerkId: "mock_artist_dev",
    email: "dev@mock.inkmity.dev",
    username: "Devon Pierce",
    handle: "devon.pierce",
    location: "Chicago, IL",
    bio: "Hyper-realism and portraiture in black & grey. Smooth gradients, lifelike detail.",
    styles: ["realism", "black-and-grey", "portrait"],
    yearsExperience: 11,
    baseRate: 220,
    bookingPreference: "referral",
    travelFrequency: "rare",
    rating: 4.9,
    reviewsCount: 97,
    bookingsCount: 280,
    shop: "Northside Custom",
    seed: "devon",
  },
  {
    clerkId: "mock_artist_lux",
    email: "lux@mock.inkmity.dev",
    username: "Lux Adeyemi",
    handle: "lux.adeyemi",
    location: "Brooklyn, NY",
    bio: "Geometric, dotwork, and sacred-geometry mandalas. Precision patterns and ornamental flow.",
    styles: ["geometric", "dotwork", "ornamental"],
    yearsExperience: 6,
    baseRate: 160,
    bookingPreference: "open",
    travelFrequency: "sometimes",
    rating: 4.6,
    reviewsCount: 51,
    bookingsCount: 140,
    shop: "Meridian Studio",
    seed: "lux",
  },
  {
    clerkId: "mock_artist_sage",
    email: "sage@mock.inkmity.dev",
    username: "Sage Thorne",
    handle: "sage.thorne",
    location: "Portland, OR",
    bio: "Watercolor and abstract — painterly washes, splatter, and color theory on skin.",
    styles: ["watercolor", "abstract", "color"],
    yearsExperience: 8,
    baseRate: 190,
    bookingPreference: "open",
    travelFrequency: "rare",
    rating: 4.5,
    reviewsCount: 43,
    bookingsCount: 120,
    shop: "Rose City Color",
    seed: "sage",
  },
];

async function run() {
  await connectDB();
  const Artist = mongoose.model("artist");

  let created = 0;
  let updated = 0;
  for (const m of MOCK) {
    const doc = {
      clerkId: m.clerkId,
      email: m.email,
      username: m.username,
      handle: m.handle.startsWith("@") ? m.handle : `@${m.handle}`,
      role: "artist",
      location: m.location,
      bio: m.bio,
      styles: m.styles,
      yearsExperience: m.yearsExperience,
      baseRate: m.baseRate,
      bookingPreference: m.bookingPreference,
      travelFrequency: m.travelFrequency,
      rating: m.rating,
      reviewsCount: m.reviewsCount,
      bookingsCount: m.bookingsCount,
      shop: m.shop,
      visible: true,
      visibility: "online",
      onboardingComplete: true,
      avatar: { url: IMG(`${m.seed}-avatar`) },
      coverImage: IMG(`${m.seed}-cover`),
      portfolioImages: [
        IMG(`${m.seed}-1`),
        IMG(`${m.seed}-2`),
        IMG(`${m.seed}-3`),
        IMG(`${m.seed}-4`),
      ],
      chargesEnabled: true,
      payoutsEnabled: true,
      stripeConnectAccountId: `acct_mock_${m.seed}`,
      onboardingCompletedAt: new Date(),
    };

    const existing = await Artist.findOne({ clerkId: m.clerkId }).select("_id");
    if (existing) {
      await Artist.updateOne({ clerkId: m.clerkId }, { $set: doc });
      updated += 1;
    } else {
      await Artist.create(doc);
      created += 1;
    }
    console.log(`  ${existing ? "↻" : "✓"} ${m.username} (@${m.handle}) — ${m.location}`);
  }

  const total = await Artist.countDocuments({ clerkId: /^mock_artist_/ });
  console.log(`\nDone. created=${created} updated=${updated} | mock artists in DB=${total}`);
  await disconnectDB();
}

run().catch(async (err) => {
  console.error("Seed failed:", err);
  await disconnectDB();
  process.exit(1);
});
