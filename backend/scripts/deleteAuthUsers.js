// Delete specific users from BOTH Clerk and Mongo by email. Destructive.
// Seed fixtures are hard-protected and can never be deleted by this script.
//
//   node --env-file=.env.development scripts/deleteAuthUsers.js email1 email2 ...
import mongoose from "mongoose";
import { clerkClient } from "@clerk/express";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";

const PROTECTED = new Set(["testclient@inkmity.dev", "testartist@inkmity.dev"]);

async function main() {
  const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) throw new Error("Pass one or more emails to delete.");

  const blocked = emails.filter((e) => PROTECTED.has(e));
  if (blocked.length) throw new Error(`Refusing to delete protected seed account(s): ${blocked.join(", ")}`);

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set.");
  await mongoose.connect(uri);
  console.log(`DB: ${mongoose.connection.name}   Clerk: ${/^sk_test/.test(process.env.CLERK_SECRET_KEY || "") ? "TEST" : "LIVE"}`);
  console.log(`Targets: ${emails.join(", ")}\n`);

  const { data: clerkUsers } = await clerkClient.users.getUserList({ emailAddress: emails, limit: 200 });

  for (const email of emails) {
    const matches = clerkUsers.filter((u) => (u.emailAddresses || []).some((a) => a.emailAddress.toLowerCase() === email));
    if (!matches.length) {
      console.log(`Clerk:  no user for ${email}`);
    }
    for (const u of matches) {
      await clerkClient.users.deleteUser(u.id);
      console.log(`Clerk:  deleted ${email} (${u.id})`);
    }
    const res = await User.deleteMany({ email: new RegExp(`^${email}$`, "i") });
    console.log(`Mongo:  deleted ${res.deletedCount} record(s) for ${email}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error("Delete failed:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
