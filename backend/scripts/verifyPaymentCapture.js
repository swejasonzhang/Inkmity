import mongoose from "mongoose";
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import Artist from "../models/Artist.js";
import "../models/Client.js";
import "../models/StudioAccount.js";
import { captureBookingBalance } from "../services/balanceCaptureService.js";
import { computeArtistStudioSplit } from "../services/studioService.js";
import { computePlatformFeeCents } from "../lib/fees.js";
import { config } from "../config/index.js";

const CLIENT_ID = "user_3Ewgduu6oxrAlKKBdpYhbpNFm9M";
const ARTIST_ID = "user_3EwgdyU68rrEyti6wcclx3xaznG";
const PRICE_CENTS = 20000;

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT FAILED: " + msg);
  console.log("  ✓ " + msg);
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!/^sk_test_/.test(key)) {
    throw new Error(
      "Refusing to run: STRIPE_SECRET_KEY is not a TEST key. Set sk_test_… in .env.development first."
    );
  }
  const stripe = new Stripe(key);

  await mongoose.connect(process.env.MONGO_URI);
  if (mongoose.connection.name !== "inkmity_dev") {
    throw new Error(`Refusing to run against "${mongoose.connection.name}". Expected inkmity_dev.`);
  }

  const artist = await Artist.findOne({ clerkId: ARTIST_ID });
  if (!artist?.stripeConnectAccountId || !artist?.chargesEnabled) {
    throw new Error(
      "Test artist isn't Connect-onboarded (test mode). Onboard testartist via the app's payout setup, then re-run."
    );
  }
  console.log(`Artist Connect: ${artist.stripeConnectAccountId} (charges enabled)\n`);

  const customer = await stripe.customers.create({ metadata: { clientId: CLIENT_ID, _verify: "1" } });
  await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });
  console.log(`Test customer + card: ${customer.id}\n`);

  const start = new Date(Date.now() - 3 * 3600 * 1000);
  const booking = await Booking.create({
    clientId: CLIENT_ID,
    artistId: ARTIST_ID,
    appointmentType: "tattoo_session",
    status: "completed",
    completedAt: new Date(),
    startAt: start,
    endAt: new Date(start.getTime() + 3600 * 1000),
    priceCents: PRICE_CENTS,
    depositRequiredCents: 0,
    depositPaidCents: 0,
    stripeCustomerId: customer.id,
    clientVerifiedAt: new Date(),
    artistVerifiedAt: new Date(),
  });
  console.log(`Booking: ${booking._id} (price $${(PRICE_CENTS / 100).toFixed(2)})\n`);

  const expectedFee = computePlatformFeeCents(PRICE_CENTS, config.platformFee);
  const split = await computeArtistStudioSplit(ARTIST_ID, PRICE_CENTS);
  console.log("Expected:");
  console.log(`  fee=$${(expectedFee / 100).toFixed(2)} | client charged=$${((PRICE_CENTS + expectedFee) / 100).toFixed(2)}`);
  if (split) {
    console.log(`  STUDIO member: artist=$${(split.artistCents / 100).toFixed(2)} studio=$${(split.studioCents / 100).toFixed(2)} (${Math.round(split.commissionPct * 100)}%)`);
  } else {
    console.log(`  SOLO artist: artist=$${(PRICE_CENTS / 100).toFixed(2)}`);
  }

  console.log("\nRunning captureBookingBalance…");
  const result = await captureBookingBalance(booking);
  console.log("  result:", JSON.stringify(result));
  assert(result.ok, "capture succeeded");

  const pi = await stripe.paymentIntents.retrieve(result.paymentIntentId);
  console.log(`\nStripe PaymentIntent ${pi.id}: $${(pi.amount / 100).toFixed(2)} ${pi.status}`);
  assert(pi.status === "succeeded", "payment succeeded");
  assert(pi.amount === PRICE_CENTS + expectedFee, `client charged rate + fee ($${((PRICE_CENTS + expectedFee) / 100).toFixed(2)})`);

  const transfers = await stripe.transfers.list({ transfer_group: `booking_${booking._id}`, limit: 10 });
  const byDest = Object.fromEntries(transfers.data.map((t) => [t.destination, t.amount]));
  const total = transfers.data.reduce((s, t) => s + t.amount, 0);
  console.log("Transfers:", transfers.data.map((t) => `${t.destination}=$${(t.amount / 100).toFixed(2)}`).join(", ") || "(none)");
  assert(total === PRICE_CENTS, `transfers total the rate ($${(PRICE_CENTS / 100).toFixed(2)}) — platform keeps the $${(expectedFee / 100).toFixed(2)} fee`);
  if (split) {
    assert(byDest[artist.stripeConnectAccountId] === split.artistCents, "artist got their share of the rate");
    assert(byDest[split.studioConnectAccountId] === split.studioCents, "studio got its commission");
  } else {
    assert(byDest[artist.stripeConnectAccountId] === PRICE_CENTS, "solo artist got 100% of the rate");
  }

  console.log("\n✅ PASS — completion charged rate + fee, split routed correctly, platform kept the fee.");
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("\n❌ " + e.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
