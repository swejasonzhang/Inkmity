import Credit from "../models/Credit.js";
import Client from "../models/Client.js";
import { config } from "../config/index.js";

function activeCreditQuery(clientId) {
  const now = new Date();
  return {
    clientId: String(clientId),
    status: "active",
    remainingCents: { $gt: 0 },
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
}

export async function getAvailableCreditCents(clientId) {
  if (!clientId) return 0;
  const credits = await Credit.find(activeCreditQuery(clientId))
    .select("remainingCents")
    .lean();
  return credits.reduce((sum, c) => sum + (c.remainingCents || 0), 0);
}

export async function grantCredit(clientId, amountCents, reason = "manual", opts = {}) {
  const amt = Math.max(0, Math.round(Number(amountCents || 0)));
  if (!clientId || amt <= 0) {
    const e = new Error("invalid_credit_grant");
    e.status = 400;
    throw e;
  }
  return Credit.create({
    clientId: String(clientId),
    amountCents: amt,
    remainingCents: amt,
    reason,
    grantedBy: opts.grantedBy,
    expiresAt: opts.expiresAt || undefined,
  });
}

// Lazily grants a once-per-year birthday credit when the client views their
// rewards/credits on their birthday (no scheduler needed). Idempotent per year
// via Client.lastBirthdayCreditYear.
export async function maybeGrantBirthdayCredit(clientId) {
  try {
    const amount = Number(config.rewards.birthdayCreditCents || 0);
    if (!clientId || amount <= 0) return false;

    const client = await Client.findOne({ clerkId: String(clientId) });
    if (!client?.dob) return false;

    const now = new Date();
    const dob = new Date(client.dob);
    const isBirthday =
      dob.getUTCMonth() === now.getUTCMonth() && dob.getUTCDate() === now.getUTCDate();
    if (!isBirthday) return false;

    const year = now.getUTCFullYear();
    if (Number(client.lastBirthdayCreditYear || 0) === year) return false;

    await grantCredit(clientId, amount, "birthday", { grantedBy: "system" });
    client.lastBirthdayCreditYear = year;
    await client.save();
    return true;
  } catch (e) {
    console.error("maybeGrantBirthdayCredit failed:", e.message);
    return false;
  }
}

// Consumes up to `amountCents` of the client's active credit, soonest-expiring
// first (no-expiry credits spent last). Returns the cents actually applied.
export async function applyCredits(clientId, amountCents) {
  let toApply = Math.max(0, Math.round(Number(amountCents || 0)));
  if (!clientId || toApply <= 0) return 0;

  const credits = await Credit.find(activeCreditQuery(clientId));
  credits.sort(
    (a, b) =>
      (a.expiresAt ? a.expiresAt.getTime() : Infinity) -
      (b.expiresAt ? b.expiresAt.getTime() : Infinity)
  );

  let applied = 0;
  for (const c of credits) {
    if (toApply <= 0) break;
    const take = Math.min(c.remainingCents, toApply);
    c.remainingCents -= take;
    if (c.remainingCents <= 0) c.status = "spent";
    await c.save();
    applied += take;
    toApply -= take;
  }
  return applied;
}
