import Studio from "../models/Studio.js";
import StudioMembership from "../models/StudioMembership.js";
import Artist from "../models/Artist.js";
import User from "../models/UserBase.js";
import { stripe } from "../lib/stripe.js";
import { effectiveCommissionPct } from "../services/studioService.js";
import { config } from "../config/index.js";

function isPlatformAdmin(actorId) {
  return config.admin.clerkIds.includes(String(actorId));
}

function getActorId(req) {
  return String(
    req.user?.clerkId || req.auth?.userId || req.user?._id || req.user?.id || ""
  ).trim();
}

function frontendBase() {
  return (process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(name) {
  const base = slugify(name) || "studio";
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const exists = await Studio.findOne({ slug: candidate }).select("_id").lean();
    if (!exists) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function isStudioAdmin(studio, actorId) {
  if (!studio || !actorId) return false;
  if (String(studio.ownerClerkId) === String(actorId)) return true;
  const membership = await StudioMembership.findOne({
    studioId: studio._id,
    artistClerkId: String(actorId),
    status: "active",
    role: { $in: ["owner", "manager"] },
  })
    .select("_id")
    .lean();
  return Boolean(membership);
}

function syncAccountFlags(studio, account) {
  studio.chargesEnabled = Boolean(account.charges_enabled);
  studio.payoutsEnabled = Boolean(account.payouts_enabled);
  studio.connectRequirementsDue = account.requirements?.currently_due || [];
  if (
    account.charges_enabled &&
    account.payouts_enabled &&
    !studio.onboardingCompletedAt
  ) {
    studio.onboardingCompletedAt = new Date();
  }
}

export async function createStudio(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const studio = await Studio.create({
      name,
      ownerClerkId: actorId,
      slug: await uniqueSlug(name),
      email: body.email || "",
      phone: body.phone || "",
      address: body.address || "",
      city: body.city || "",
      lat: body.lat,
      lng: body.lng,
      bio: body.bio || "",
      defaultCommissionPct:
        body.defaultCommissionPct !== undefined
          ? Math.max(0, Math.min(1, Number(body.defaultCommissionPct)))
          : undefined,
    });

    res.status(201).json(studio);
  } catch (err) {
    console.error("createStudio error:", err);
    res.status(500).json({ error: "Failed to create studio" });
  }
}

export async function getStudio(req, res) {
  try {
    const { studioId } = req.params;
    const studio = await Studio.findById(studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    res.json(studio);
  } catch (err) {
    if (err.name === "CastError")
      return res.status(400).json({ error: "Invalid studio id" });
    res.status(500).json({ error: "Failed to fetch studio" });
  }
}

export async function getMyStudios(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const owned = await Studio.find({ ownerClerkId: actorId, active: true });

    const memberships = await StudioMembership.find({
      artistClerkId: actorId,
      status: "active",
    }).lean();
    const memberStudioIds = memberships.map((m) => m.studioId);
    const memberStudios = memberStudioIds.length
      ? await Studio.find({ _id: { $in: memberStudioIds }, active: true })
      : [];

    const seen = new Set(owned.map((s) => String(s._id)));
    const combined = [
      ...owned,
      ...memberStudios.filter((s) => !seen.has(String(s._id))),
    ];

    res.json(combined);
  } catch (err) {
    console.error("getMyStudios error:", err);
    res.status(500).json({ error: "Failed to fetch studios" });
  }
}

export async function updateStudio(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (!(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Only the studio owner can update settings" });

    const body = req.body || {};
    const editable = ["name", "email", "phone", "address", "city", "lat", "lng", "bio"];
    for (const key of editable) {
      if (body[key] !== undefined) studio[key] = body[key];
    }
    if (body.defaultCommissionPct !== undefined) {
      studio.defaultCommissionPct = Math.max(
        0,
        Math.min(1, Number(body.defaultCommissionPct))
      );
    }
    await studio.save();
    res.json(studio);
  } catch (err) {
    console.error("updateStudio error:", err);
    res.status(500).json({ error: "Failed to update studio" });
  }
}

export async function listMembers(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (!(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Forbidden" });

    const memberships = await StudioMembership.find({
      studioId: studio._id,
      status: { $in: ["invited", "active"] },
    }).lean();

    const clerkIds = memberships.map((m) => m.artistClerkId);
    const users = clerkIds.length
      ? await User.find({ clerkId: { $in: clerkIds } })
          .select("clerkId username handle avatar")
          .lean()
      : [];
    const byClerkId = new Map(users.map((u) => [u.clerkId, u]));

    const members = memberships.map((m) => ({
      ...m,
      effectiveCommissionPct: effectiveCommissionPct(studio, m),
      artist: byClerkId.get(m.artistClerkId) || null,
    }));

    res.json(members);
  } catch (err) {
    console.error("listMembers error:", err);
    res.status(500).json({ error: "Failed to list members" });
  }
}

export async function inviteArtist(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (!(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Only studio admins can invite artists" });

    const body = req.body || {};
    let artistClerkId = body.artistClerkId ? String(body.artistClerkId).trim() : "";
    const handle = body.handle ? String(body.handle).trim().replace(/^@/, "") : "";

    if (!artistClerkId && handle) {
      const user = await User.findOne({ handle }).select("clerkId role").lean();
      if (!user) return res.status(404).json({ error: "artist_not_found" });
      artistClerkId = user.clerkId;
    }
    if (!artistClerkId)
      return res.status(400).json({ error: "artistClerkId or handle required" });

    const artist = await Artist.findOne({ clerkId: artistClerkId }).select("_id").lean();
    if (!artist)
      return res.status(404).json({ error: "artist_not_found", message: "That user is not an artist." });

    const commissionPct =
      body.commissionPct !== undefined && body.commissionPct !== null
        ? Math.max(0, Math.min(1, Number(body.commissionPct)))
        : null;

    const membership = await StudioMembership.findOneAndUpdate(
      { studioId: studio._id, artistClerkId },
      {
        studioId: studio._id,
        artistClerkId,
        role: "artist",
        status: "invited",
        commissionPct,
        invitedBy: actorId,
        invitedAt: new Date(),
        respondedAt: null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(membership);
  } catch (err) {
    console.error("inviteArtist error:", err);
    res.status(500).json({ error: "Failed to invite artist" });
  }
}

export async function getMyMemberships(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const memberships = await StudioMembership.find({
      artistClerkId: actorId,
      status: { $in: ["invited", "active"] },
    }).lean();

    const studioIds = memberships.map((m) => m.studioId);
    const studios = studioIds.length
      ? await Studio.find({ _id: { $in: studioIds } }).lean()
      : [];
    const byId = new Map(studios.map((s) => [String(s._id), s]));

    const result = memberships.map((m) => {
      const studio = byId.get(String(m.studioId)) || null;
      return {
        ...m,
        effectiveCommissionPct: studio
          ? effectiveCommissionPct(studio, m)
          : null,
        studio: studio
          ? { _id: studio._id, name: studio.name, city: studio.city, logo: studio.logo }
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getMyMemberships error:", err);
    res.status(500).json({ error: "Failed to fetch memberships" });
  }
}

export async function respondToInvite(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { membershipId } = req.params;
    const action = String(req.body?.action || "").toLowerCase();
    if (!["accept", "decline"].includes(action))
      return res.status(400).json({ error: "action must be accept or decline" });

    const membership = await StudioMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ error: "not_found" });
    if (String(membership.artistClerkId) !== actorId)
      return res.status(403).json({ error: "Only the invited artist can respond" });
    if (membership.status !== "invited")
      return res.status(400).json({ error: "invite_not_pending", currentStatus: membership.status });

    membership.status = action === "accept" ? "active" : "declined";
    membership.respondedAt = new Date();
    await membership.save();

    res.json(membership);
  } catch (err) {
    console.error("respondToInvite error:", err);
    res.status(500).json({ error: "Failed to respond to invite" });
  }
}

export async function updateMember(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { studioId, artistClerkId } = req.params;
    const studio = await Studio.findById(studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (!(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Forbidden" });

    const membership = await StudioMembership.findOne({
      studioId: studio._id,
      artistClerkId: String(artistClerkId),
    });
    if (!membership) return res.status(404).json({ error: "member_not_found" });

    const body = req.body || {};
    if (body.commissionPct !== undefined) {
      membership.commissionPct =
        body.commissionPct === null
          ? null
          : Math.max(0, Math.min(1, Number(body.commissionPct)));
    }
    if (body.role !== undefined && ["manager", "artist"].includes(body.role)) {
      membership.role = body.role;
    }
    await membership.save();
    res.json(membership);
  } catch (err) {
    console.error("updateMember error:", err);
    res.status(500).json({ error: "Failed to update member" });
  }
}

export async function removeMember(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const { studioId, artistClerkId } = req.params;
    const studio = await Studio.findById(studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });

    const isSelf = String(artistClerkId) === actorId;
    if (!isSelf && !(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Forbidden" });

    const membership = await StudioMembership.findOne({
      studioId: studio._id,
      artistClerkId: String(artistClerkId),
    });
    if (!membership) return res.status(404).json({ error: "member_not_found" });

    membership.status = "removed";
    membership.respondedAt = new Date();
    await membership.save();
    res.json({ ok: true, membership });
  } catch (err) {
    console.error("removeMember error:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
}

export async function createStudioConnect(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (String(studio.ownerClerkId) !== actorId)
      return res.status(403).json({ error: "Only the studio owner can set up payouts" });

    if (studio.stripeConnectAccountId)
      return res.json({ accountId: studio.stripeConnectAccountId, existing: true });

    const account = await stripe.accounts.create({
      type: "express",
      email: studio.email || undefined,
      business_type: "company",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { studioId: String(studio._id), ownerClerkId: studio.ownerClerkId },
    });

    studio.stripeConnectAccountId = account.id;
    syncAccountFlags(studio, account);
    await studio.save();

    res.json({ accountId: account.id, existing: false });
  } catch (err) {
    console.error("createStudioConnect error:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function createStudioAccountLink(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (String(studio.ownerClerkId) !== actorId)
      return res.status(403).json({ error: "Only the studio owner can set up payouts" });

    let accountId = studio.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: studio.email || undefined,
        business_type: "company",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { studioId: String(studio._id), ownerClerkId: studio.ownerClerkId },
      });
      accountId = account.id;
      studio.stripeConnectAccountId = accountId;
      syncAccountFlags(studio, account);
      await studio.save();
    }

    const base = frontendBase();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/studios?studio=${studio._id}&connect=refresh`,
      return_url: `${base}/studios?studio=${studio._id}&connect=return`,
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error("createStudioAccountLink error:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}

export async function setStudioVerification(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });
    if (!isPlatformAdmin(actorId))
      return res.status(403).json({ error: "Only platform admins can verify studios" });

    const status = String(req.body?.status || "").toLowerCase();
    if (!["pending", "verified", "rejected"].includes(status))
      return res.status(400).json({ error: "status must be pending, verified, or rejected" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });

    studio.verificationStatus = status;
    studio.verifiedAt = status === "verified" ? new Date() : null;
    studio.verificationNotes = req.body?.notes || "";
    await studio.save();

    res.json(studio);
  } catch (err) {
    console.error("setStudioVerification error:", err);
    res.status(500).json({ error: "Failed to update verification" });
  }
}

export async function getStudioConnectStatus(req, res) {
  try {
    const actorId = getActorId(req);
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const studio = await Studio.findById(req.params.studioId);
    if (!studio) return res.status(404).json({ error: "not_found" });
    if (!(await isStudioAdmin(studio, actorId)))
      return res.status(403).json({ error: "Forbidden" });

    if (!studio.stripeConnectAccountId) {
      return res.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsDue: [],
      });
    }

    try {
      const account = await stripe.accounts.retrieve(studio.stripeConnectAccountId);
      syncAccountFlags(studio, account);
      await studio.save();
    } catch (e) {
      console.warn("getStudioConnectStatus refresh failed, using cached flags:", e.message);
    }

    res.json({
      connected: true,
      accountId: studio.stripeConnectAccountId,
      chargesEnabled: Boolean(studio.chargesEnabled),
      payoutsEnabled: Boolean(studio.payoutsEnabled),
      requirementsDue: studio.connectRequirementsDue || [],
    });
  } catch (err) {
    console.error("getStudioConnectStatus error:", err);
    res.status(err.status || 500).json({ error: err.message || "Internal error" });
  }
}
