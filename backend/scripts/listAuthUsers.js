import mongoose from "mongoose";
import { clerkClient } from "@clerk/express";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";

const SEED_EMAILS = new Set(["testclient@inkmity.dev", "testartist@inkmity.dev"]);

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set (pass --env-file=.env.development).");
  await mongoose.connect(uri);
  const isTestClerk = /^sk_test/.test(process.env.CLERK_SECRET_KEY || "");
  console.log(`DB: ${mongoose.connection.name}   Clerk: ${isTestClerk ? "TEST" : "LIVE"}\n`);

  const mongoUsers = await User.find({}, "email username role clerkId createdAt").sort({ createdAt: 1 }).lean();
  console.log(`Mongo users (${mongoUsers.length}):`);
  for (const u of mongoUsers) {
    const tag = SEED_EMAILS.has(u.email) ? " [SEED]" : "";
    console.log(`  ${u.email}  | ${u.role} | clerkId=${u.clerkId} | ${new Date(u.createdAt).toISOString().slice(0, 10)}${tag}`);
  }

  const { data: clerkUsers } = await clerkClient.users.getUserList({ limit: 200 });
  console.log(`\nClerk users (${clerkUsers.length}):`);
  for (const u of clerkUsers) {
    const email = u.emailAddresses?.[0]?.emailAddress || "(no email)";
    const tag = SEED_EMAILS.has(email) ? " [SEED]" : "";
    console.log(`  ${email}  | id=${u.id} | ${new Date(u.createdAt).toISOString().slice(0, 10)}${tag}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("List failed:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
