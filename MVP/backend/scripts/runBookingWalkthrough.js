import "../loadEnv.js";
process.env.DEV_BYPASS_GATES = "true";
if (process.env.NODE_ENV === "production") process.env.NODE_ENV = "development";

import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import "../models/UserBase.js";
import "../models/Artist.js";
import "../models/Client.js";
import Booking from "../models/Booking.js";
import {
  createTattooSession,
  acceptAppointment,
  completeBooking,
} from "../controllers/bookingController.js";
import { getRewardsSummary } from "../services/rewardsService.js";

function mockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (d) => {
    res.body = d;
    return res;
  };
  res.send = res.json;
  return res;
}

async function call(fn, { userId, body = {}, params = {}, query = {} }) {
  const req = { user: { clerkId: userId }, auth: { userId }, body, params, query };
  const res = mockRes();
  await fn(req, res);
  return { status: res.statusCode, body: res.body };
}

const money = (c) => `$${((Number(c) || 0) / 100).toFixed(2)}`;

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

  const clientHandle = "walkthrough_client";
  let client = await Client.findOne({ handle: clientHandle });
  if (!client) {
    client = await Client.create({
      clerkId: clientHandle,
      email: `${clientHandle}@mock.inkmity.dev`,
      username: "Test Client",
      handle: clientHandle,
      role: "client",
      onboardingComplete: true,
      visible: true,
    });
  }

  const artistId = kenji.clerkId;
  const clientId = client.clerkId;

  console.log(`\n=========================================================`);
  console.log(`  Booking walkthrough: ${client.username}  ->  ${kenji.username} (@${kenji.handle})`);
  console.log(`  (DEV_BYPASS_GATES=true — gates/deposit/Stripe waived)`);
  console.log(`=========================================================`);

  const before = await getRewardsSummary(clientId);
  console.log(`\n[0] Rewards BEFORE`);
  console.log(`    tier=${before.tier.label} (${before.tier.key}) · fee=${(before.currentFeePct * 100).toFixed(0)}% · completed=${before.completedBookings}`);

  const dayOffset = Number(process.argv[2]) || 3;
  const startISO = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).toISOString();
  const priceCents = 20000;
  const create = await call(createTattooSession, {
    userId: clientId,
    body: { artistId, startISO, durationMinutes: 120, priceCents },
  });
  console.log(`\n[1] Client requests a 2h tattoo session (${money(priceCents)}) for ${startISO.slice(0, 16).replace("T", " ")}`);
  if (create.status !== 201) {
    console.error(`    -> FAILED (status ${create.status}):`, create.body);
    await disconnectDB();
    process.exit(1);
  }
  const bookingId = String(create.body._id);
  console.log(`    -> 201 created · id=${bookingId} · status=${create.body.status} · depositRequired=${money(create.body.depositRequiredCents)}`);

  const accept = await call(acceptAppointment, { userId: artistId, params: { id: bookingId } });
  console.log(`\n[2] Artist accepts the appointment`);
  console.log(`    -> ${accept.status} · status=${accept.body?.status} · confirmedAt=${accept.body?.confirmedAt ? new Date(accept.body.confirmedAt).toISOString() : "n/a"}`);

  const complete = await call(completeBooking, { userId: artistId, params: { id: bookingId } });
  console.log(`\n[3] Artist marks the session complete`);
  console.log(`    -> ${complete.status} · status=${complete.body?.status} · completedAt=${complete.body?.completedAt ? new Date(complete.body.completedAt).toISOString() : "n/a"}`);

  const after = await getRewardsSummary(clientId);
  console.log(`\n[4] Rewards AFTER`);
  console.log(`    tier=${after.tier.label} (${after.tier.key}) · fee=${(after.currentFeePct * 100).toFixed(0)}% · completed=${after.completedBookings}`);
  if (after.nextTier) {
    console.log(`    next: ${after.nextTier.bookingsToNextTier} more booking(s) -> ${after.nextTier.label} (${(after.nextTier.feePct * 100).toFixed(0)}% fee)`);
  } else {
    console.log(`    (top tier reached)`);
  }

  const finalDoc = await Booking.findById(bookingId).lean();
  console.log(`\n=== RESULT ===`);
  console.log(`Booking ${bookingId}`);
  console.log(`  status:   ${finalDoc.status}`);
  console.log(`  artist:   ${kenji.username} (${finalDoc.artistId})`);
  console.log(`  client:   ${client.username} (${finalDoc.clientId})`);
  console.log(`  start:    ${finalDoc.startAt ? new Date(finalDoc.startAt).toISOString() : "n/a"}`);
  console.log(`  end:      ${finalDoc.endAt ? new Date(finalDoc.endAt).toISOString() : "n/a"}`);
  console.log(`Client rewards: ${before.tier.key} -> ${after.tier.key} · completedBookings ${before.completedBookings} -> ${after.completedBookings}`);
  console.log(`================\n`);

  await disconnectDB();
}

run().catch(async (err) => {
  console.error("Walkthrough failed:", err);
  await disconnectDB();
  process.exit(1);
});
