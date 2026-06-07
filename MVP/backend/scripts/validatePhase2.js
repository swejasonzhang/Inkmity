import dotenv from "dotenv";
dotenv.config();
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error(
    "Refusing to run: STRIPE_SECRET_KEY must be a TEST key (sk_test_...).\n" +
      "Add it to backend/.env first. This script never runs against live keys."
  );
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
const ok = (m) => console.log("  ✓", m);
const fail = (m, e) => {
  console.error("  ✗", m, "—", e?.message || e);
  process.exitCode = 1;
};

async function createActiveAccount(label) {
  const email = `${label}-${Date.now()}@example.com`;
  const acct = await stripe.accounts.create({
    type: "custom",
    country: "US",
    email,
    business_type: "individual",
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    business_profile: {
      mcc: "7299",
      url: "https://inkmity.com",
      product_description: "Tattoo services",
    },
    individual: {
      first_name: "Test",
      last_name: label,
      email,
      phone: "0000000000",
      ssn_last_4: "0000",
      dob: { day: 1, month: 1, year: 1990 },
      address: {
        line1: "address_full_match",
        city: "Beverly Hills",
        state: "CA",
        postal_code: "90210",
        country: "US",
      },
    },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "8.8.8.8" },
    external_account: {
      object: "bank_account",
      country: "US",
      currency: "usd",
      routing_number: "110000000",
      account_number: "000123456789",
    },
  });
  return acct;
}

async function main() {
  const transferGroup = `booking_validate_${Date.now()}`;
  console.log("\nPhase 2a Stripe validation (test mode)\n");

  // 1) Connected accounts (artist + studio) become transfer-ready
  let artist, studio;
  console.log("1) Connected accounts");
  try {
    [artist, studio] = await Promise.all([
      createActiveAccount("artist"),
      createActiveAccount("studio"),
    ]);
    const aCap = artist.capabilities?.transfers;
    const sCap = studio.capabilities?.transfers;
    ok(`artist acct ${artist.id} transfers=${aCap}`);
    ok(`studio acct ${studio.id} transfers=${sCap}`);
    if (aCap !== "active" || sCap !== "active") {
      fail(
        "transfers capability not active",
        "accounts need transfers=active to receive split payouts"
      );
    }
  } catch (e) {
    fail("could not create connected accounts", e);
    return;
  }

  // 2) Deposit charge: transfer_group + saves the card for the balance
  console.log("2) Deposit PaymentIntent (saves card via setup_future_usage)");
  let customer, savedPmId;
  try {
    customer = await stripe.customers.create({ metadata: { test: "phase2" } });
    const pm = await stripe.paymentMethods.create({
      type: "card",
      card: { token: "tok_visa" },
    });
    // Deposit is confirmed ON-session (the client enters their card), which is
    // required when saving the card via setup_future_usage — mirrors the app.
    const pi = await stripe.paymentIntents.create({
      amount: 6000,
      currency: "usd",
      customer: customer.id,
      payment_method: pm.id,
      confirm: true,
      setup_future_usage: "off_session",
      transfer_group: transferGroup,
      payment_method_types: ["card"],
      description: "Phase 2 validation deposit",
    });
    if (pi.status !== "succeeded") throw new Error(`status=${pi.status}`);
    ok(`deposit PI ${pi.id} succeeded, transfer_group=${pi.transfer_group}`);

    const pms = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
    });
    savedPmId = pms.data[0]?.id;
    if (!savedPmId) throw new Error("no saved card on customer");
    ok(`card saved for balance capture (pm ${savedPmId})`);
  } catch (e) {
    fail("deposit charge / card-saving failed", e);
  }

  // 3) Balance capture later (the 2b off-session charge) works on saved card
  console.log("3) Off-session balance capture on saved card");
  try {
    if (!customer || !savedPmId) throw new Error("no saved card from step 2");
    const balancePi = await stripe.paymentIntents.create({
      amount: 14000,
      currency: "usd",
      customer: customer.id,
      payment_method: savedPmId,
      confirm: true,
      off_session: true,
      transfer_group: transferGroup,
      payment_method_types: ["card"],
      description: "Phase 2 validation balance",
    });
    if (balancePi.status !== "succeeded") throw new Error(`status=${balancePi.status}`);
    ok(`off-session balance PI ${balancePi.id} succeeded`);
  } catch (e) {
    fail("off-session balance capture failed", e);
  }

  // 4) Split transfers to artist + studio (separate charges and transfers)
  console.log("4) Split transfers (artist + studio)");
  try {
    // ensure immediately-available platform balance for the transfers
    await stripe.charges.create({
      amount: 30000,
      currency: "usd",
      source: "tok_bypassPending",
      description: "fund test platform balance",
    });
    const artistCents = 4200;
    const studioCents = 1800;
    const t1 = await stripe.transfers.create({
      amount: artistCents,
      currency: "usd",
      destination: artist.id,
      transfer_group: transferGroup,
      metadata: { kind: "artist" },
    });
    const t2 = await stripe.transfers.create({
      amount: studioCents,
      currency: "usd",
      destination: studio.id,
      transfer_group: transferGroup,
      metadata: { kind: "studio" },
    });
    ok(`artist transfer ${t1.id} = $${(artistCents / 100).toFixed(2)}`);
    ok(`studio transfer ${t2.id} = $${(studioCents / 100).toFixed(2)}`);
    ok(`both share transfer_group=${transferGroup} (reconcilable to the booking)`);

    // 5) Chargeback clawback: reverse both transfer legs
    console.log("5) Chargeback clawback (reverse transfers)");
    const r1 = await stripe.transfers.createReversal(t1.id, { amount: artistCents });
    const r2 = await stripe.transfers.createReversal(t2.id, { amount: studioCents });
    ok(`reversed artist transfer (${r1.id})`);
    ok(`reversed studio transfer (${r2.id}) — funds clawed back from connected accounts`);
  } catch (e) {
    fail("split transfers / clawback failed", e);
  }

  console.log(
    process.exitCode === 1
      ? "\nVALIDATION FAILED — see ✗ above.\n"
      : "\nVALIDATION PASSED — charge, card-saving, off-session balance, and split transfers all work.\n"
  );
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
