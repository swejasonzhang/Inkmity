import mongoose from "mongoose";
import { clerkClient } from "@clerk/express";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import "../models/StudioAccount.js";
import Studio from "../models/Studio.js";

const ALLOWED_DB = "inkmity_dev";
const PASSWORD = "InkmityDevTest!2026";

export const TEST_ACCOUNTS = [
  {
    role: "client",
    email: "testclient@inkmity.dev",
    username: "testclient",
    handle: "@testclient",
    extra: {
      location: "New York, NY",
      bio: "Dev test client.",
      budgetMin: 100,
      budgetMax: 300,
      placement: "forearm",
      size: "medium",
      dob: new Date("1995-05-15"),
    },
  },
  {
    role: "artist",
    email: "testartist@inkmity.dev",
    username: "testartist",
    handle: "@testartist",
    extra: {
      styles: ["traditional", "blackwork"],
      location: "New York, NY",
      bio: "Dev test artist.",
      shop: "Inkmity Test Studio",
      shopAddress: "123 Test St, New York, NY",
      yearsExperience: 5,
      baseRate: 150,
      baseRateMax: 400,
      bookingPreference: "open",
      travelFrequency: "rare",
    },
  },
  {
    role: "studio",
    email: "teststudio@inkmity.dev",
    username: "teststudio",
    handle: "@teststudio",
    extra: {},
    studio: {
      name: "Inkmity Test Studio",
      slug: "inkmity-test-studio",
      city: "New York, NY",
      address: "123 Test St, New York, NY",
      bio: "Dev test studio.",
      active: true,
    },
  },
];

async function ensureClerkUser({ email, role }) {
  const { data: existing } = await clerkClient.users.getUserList({
    emailAddress: [email],
  });
  if (existing.length > 0) {
    const u = existing[0];
    await clerkClient.users.updateUser(u.id, {
      password: PASSWORD,
      skipPasswordChecks: true,
    });
    return u.id;
  }
  const created = await clerkClient.users.createUser({
    emailAddress: [email],
    password: PASSWORD,
    skipPasswordChecks: true,
    unsafeMetadata: { role },
  });
  return created.id;
}

async function main() {
  if (!/^sk_test/.test(process.env.CLERK_SECRET_KEY || "")) {
    throw new Error("Refusing to run: CLERK_SECRET_KEY is not a test key. Pass --env-file=.env.development.");
  }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set (pass --env-file=.env.development).");

  await mongoose.connect(uri);
  if (mongoose.connection.name !== ALLOWED_DB) {
    await mongoose.disconnect();
    throw new Error(`Refusing to run against "${mongoose.connection.name}". Expected "${ALLOWED_DB}".`);
  }
  console.log(`Connected to ${mongoose.connection.name} (Clerk test instance).`);

  const legacy = await User.deleteMany({
    email: { $in: ["mockclient@inkmity.dev", "mockartist@inkmity.dev"] },
  });
  if (legacy.deletedCount) console.log(`Removed ${legacy.deletedCount} legacy mock user(s).`);

  for (const acct of TEST_ACCOUNTS) {
    const clerkId = await ensureClerkUser(acct);
    const Model = mongoose.model(acct.role);
    await User.deleteOne({ email: acct.email });
    const userDoc = await Model.create({
      clerkId,
      email: acct.email,
      username: acct.username,
      handle: acct.handle,
      role: acct.role,
      onboardingComplete: true,
      ...acct.extra,
    });

    if (acct.role === "studio" && acct.studio) {
      await Studio.deleteMany({ ownerClerkId: clerkId });
      const studio = await Studio.create({ ownerClerkId: clerkId, ...acct.studio });
      userDoc.ownedStudioId = studio._id;
      await userDoc.save();
      console.log(`  + studio entity "${studio.name}" (${studio._id})`);
    }

    console.log(`Ready: ${acct.handle} (${acct.email}) -> clerkId ${clerkId}`);
  }

  await mongoose.disconnect();
  console.log(`\nDone. Dev login password for all test accounts: ${PASSWORD}`);
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
