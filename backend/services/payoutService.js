import Artist from "../models/Artist.js";
import { stripe } from "../lib/stripe.js";
import { computeArtistStudioSplit } from "./studioService.js";

export async function getArtistPayoutAccount(artistId) {
  const artist = await Artist.findOne({ clerkId: String(artistId) });
  if (artist?.stripeConnectAccountId && artist.chargesEnabled) {
    return artist.stripeConnectAccountId;
  }
  return null;
}

export async function computePayoutPlan({ artistId, transferableCents }) {
  const amount = Math.max(0, Math.round(Number(transferableCents || 0)));
  const artistAccount = await getArtistPayoutAccount(artistId);
  if (!artistAccount) {
    const e = new Error(
      "This artist hasn't finished payment setup yet, so payouts can't be processed."
    );
    e.code = "artist_not_onboarded";
    e.status = 409;
    throw e;
  }

  const split = await computeArtistStudioSplit(artistId, amount);

  if (!split) {
    return {
      transfers:
        amount > 0
          ? [{ destination: artistAccount, amountCents: amount, kind: "artist" }]
          : [],
      split: null,
    };
  }

  if (!split.studioPayoutsReady || !split.studioConnectAccountId) {
    const e = new Error(
      "This artist's studio hasn't finished payment setup, so payouts can't be split."
    );
    e.code = "studio_not_onboarded";
    e.status = 409;
    throw e;
  }

  const transfers = [];
  if (split.artistCents > 0) {
    transfers.push({
      destination: artistAccount,
      amountCents: split.artistCents,
      kind: "artist",
    });
  }
  if (split.studioCents > 0) {
    transfers.push({
      destination: split.studioConnectAccountId,
      amountCents: split.studioCents,
      kind: "studio",
    });
  }
  return { transfers, split };
}

export async function executePayouts({
  billing,
  artistId,
  transferableCents,
  transferGroup,
  currency = "usd",
}) {
  const { transfers, split } = await computePayoutPlan({
    artistId,
    transferableCents,
  });
  if (split?.studioId) billing.studioId = split.studioId;

  // Resume-safe: skip transfers already recorded (by kind), and persist after
  // each one so a mid-loop failure can't lose the record of a transfer that
  // already happened at Stripe. The per-kind idempotency key prevents double-pay.
  const results = Array.isArray(billing.transfers) ? [...billing.transfers] : [];
  const doneKinds = new Set(results.filter((t) => t.status === "paid").map((t) => t.kind));

  for (const t of transfers) {
    if (doneKinds.has(t.kind)) continue;
    const tr = await stripe.transfers.create(
      {
        amount: t.amountCents,
        currency,
        destination: t.destination,
        transfer_group: transferGroup,
        metadata: { billingId: String(billing._id), kind: t.kind },
      },
      { idempotencyKey: `transfer_${billing._id}_${t.kind}` }
    );
    results.push({ ...t, stripeTransferId: tr.id, status: "paid" });
    billing.transfers = results;
    await billing.save();
  }

  // Persist studioId even when there were no new transfers to make.
  await billing.save();
  return results;
}

export async function reversePayouts(billing) {
  if (!billing || !Array.isArray(billing.transfers)) return [];
  const reversals = [];
  for (const t of billing.transfers) {
    if (!t.stripeTransferId || t.status === "reversed") continue;
    try {
      const rev = await stripe.transfers.createReversal(
        t.stripeTransferId,
        { amount: t.amountCents, metadata: { billingId: String(billing._id), kind: t.kind } },
        { idempotencyKey: `reversal_${billing._id}_${t.kind}` }
      );
      t.status = "reversed";
      reversals.push({ kind: t.kind, reversalId: rev.id, amountCents: t.amountCents });
    } catch (e) {
      console.error(`reversePayouts ${t.kind} failed:`, e.message);
      throw e;
    }
  }
  billing.markModified?.("transfers");
  await billing.save();
  return reversals;
}
