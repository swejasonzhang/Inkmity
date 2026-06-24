import Artist from "../models/Artist.js";
import { getActorId } from "../lib/auth.js";
import { stripe } from "../lib/stripe.js";
import { config } from "../config/index.js";
import { hasSignedCurrentDocument } from "../services/signatureGateService.js";
import { sendError } from "../lib/httpError.js";

async function ensureArtistAgreement(artist, res) {
  if (config.dev.bypassGates) return true;
  const signed = await hasSignedCurrentDocument(artist.clerkId, "artist_agreement");
  if (!signed) {
    res.status(403).json({
      error: "agreement_required",
      docType: "artist_agreement",
      message: "Please review and sign the Artist Agreement before setting up payouts.",
    });
    return false;
  }
  return true;
}

function frontendBase() {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

async function requireArtist(req, res) {
  const clerkId = getActorId(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const artist = await Artist.findOne({ clerkId });
  if (!artist) {
    res.status(403).json({ error: "Only artists can set up payouts" });
    return null;
  }
  return artist;
}

function syncAccountFlags(artist, account) {
  artist.chargesEnabled = Boolean(account.charges_enabled);
  artist.payoutsEnabled = Boolean(account.payouts_enabled);
  artist.connectRequirementsDue = account.requirements?.currently_due || [];
  if (account.charges_enabled && account.payouts_enabled && !artist.onboardingCompletedAt) {
    artist.onboardingCompletedAt = new Date();
  }
}

export async function createConnectAccount(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    if (!(await ensureArtistAgreement(artist, res))) return;

    if (artist.stripeConnectAccountId) {
      return res.json({ accountId: artist.stripeConnectAccountId, existing: true });
    }

    const account = await stripe.accounts.create({
      type: "express",
      email: artist.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { clerkId: artist.clerkId, userId: String(artist._id) },
    });

    artist.stripeConnectAccountId = account.id;
    syncAccountFlags(artist, account);
    await artist.save();

    res.json({ accountId: account.id, existing: false });
  } catch (err) {
    console.error("createConnectAccount error:", err);
    sendError(res, err);
  }
}

export async function createAccountLink(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    if (!(await ensureArtistAgreement(artist, res))) return;

    let accountId = artist.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: artist.email,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { clerkId: artist.clerkId, userId: String(artist._id) },
      });
      accountId = account.id;
      artist.stripeConnectAccountId = accountId;
      syncAccountFlags(artist, account);
      await artist.save();
    }

    const base = frontendBase();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/profile?connect=refresh`,
      return_url: `${base}/profile?connect=return`,
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error("createAccountLink error:", err);
    sendError(res, err);
  }
}

export async function getConnectStatus(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    if (!artist.stripeConnectAccountId) {
      return res.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
      });
    }

    try {
      const account = await stripe.accounts.retrieve(artist.stripeConnectAccountId);
      syncAccountFlags(artist, account);
      await artist.save();
    } catch (e) {
      console.warn("getConnectStatus refresh failed, using cached flags:", e.message);
    }

    res.json({
      connected: true,
      accountId: artist.stripeConnectAccountId,
      chargesEnabled: Boolean(artist.chargesEnabled),
      payoutsEnabled: Boolean(artist.payoutsEnabled),
      requirementsDue: artist.connectRequirementsDue || [],
    });
  } catch (err) {
    console.error("getConnectStatus error:", err);
    sendError(res, err);
  }
}

export async function createLoginLink(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    if (!artist.stripeConnectAccountId) {
      return res.status(400).json({ error: "no_connect_account" });
    }
    const link = await stripe.accounts.createLoginLink(artist.stripeConnectAccountId);
    res.json({ url: link.url });
  } catch (err) {
    console.error("createLoginLink error:", err);
    sendError(res, err);
  }
}
