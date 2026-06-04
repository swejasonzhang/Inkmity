import Artist from "../models/Artist.js";
import { stripe } from "../lib/stripe.js";

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
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

// Mirror the latest Stripe account flags onto the Artist document.
function syncAccountFlags(artist, account) {
  artist.chargesEnabled = Boolean(account.charges_enabled);
  artist.payoutsEnabled = Boolean(account.payouts_enabled);
  artist.connectRequirementsDue = account.requirements?.currently_due || [];
  if (account.charges_enabled && account.payouts_enabled && !artist.onboardingCompletedAt) {
    artist.onboardingCompletedAt = new Date();
  }
}

// POST /connect/account — create (or reuse) the artist's Express account.
export async function createConnectAccount(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

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
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

// POST /connect/account-link — hosted onboarding URL (creates the account if missing).
export async function createAccountLink(req, res) {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

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
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

// GET /connect/status — onboarding/payout status for the artist dashboard.
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

    // Refresh flags from Stripe so the dashboard reflects reality even if a
    // webhook was missed.
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
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

// POST /connect/login-link — Express dashboard link to view payouts.
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
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}
