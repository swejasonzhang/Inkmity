import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cloudinary from "../lib/cloudinary.js";

const SAFE_ROLES = new Set(["client", "artist"]);

function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 24);
}
function randomSuffix(n = 4) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < n; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export const getMe = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const me = await User.findOne({ clerkId });
    if (!me) return res.status(404).json({ error: "User not found" });
    res.json(me);
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const getAvatarSignature = async (_req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/avatars";
    const paramsToSign = { timestamp, folder };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );
    res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch {
    res.status(500).json({ error: "Failed to create signature" });
  }
};

export const updateMyAvatar = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const { url, publicId, width, height, alt } = req.body || {};
    if (!url) return res.status(400).json({ error: "url required" });

    const user = await User.findOneAndUpdate(
      { clerkId },
      {
        $set: {
          avatar: { url, publicId, width, height, alt: alt || "Profile photo" },
        },
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to update avatar" });
  }
};

export const deleteMyAvatar = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $unset: { avatar: 1 } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to delete avatar" });
  }
};

/* ========= REFERENCES (tattoo-specific) ========= */
export const getReferenceSignature = async (_req, res) => {
  res.status(200).json({
    uploadPreset: "unsigned",
    ts: Date.now(),
    signature: "dev-signature-placeholder",
    cloudName: "dev",
    folder: "references",
  });
};

export const saveMyReferences = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: { references: urls } },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, references: user.references || [] });
  } catch {
    res.status(500).json({ error: "Failed to save references" });
  }
};

/* ========= ARTISTS ========= */
export const getArtists = async (_req, res) => {
  try {
    const artists = await User.find({ role: "artist" })
      .sort({ rating: -1 })
      .select("_id username location style priceRange rating yearsExperience");
    res.json(artists);
  } catch {
    res.status(500).json({ error: "Failed to fetch artists" });
  }
};

export const getArtistById = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await User.findOne({ _id: id, role: "artist" });
    if (!artist) return res.status(404).json({ error: "Artist not found" });
    res.json(artist);
  } catch {
    res.status(500).json({ error: "Failed to fetch artist" });
  }
};

export const syncUser = async (req, res) => {
  try {
    const authClerkId = req.auth?.userId || null;
    const {
      clerkId: bodyClerkId,
      email,
      role: rawRole,
      username,
      firstName,
      lastName,
      profile,
      ...rest
    } = req.body || {};

    const clerkId = authClerkId || bodyClerkId;
    if (!clerkId || !email || !rawRole) {
      return res
        .status(400)
        .json({ error: "clerkId, email, role are required" });
    }

    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";

    const existing = await User.findOne({ clerkId }).lean();
    if (existing && existing.role && existing.role !== role) {
      return res
        .status(409)
        .json({ error: `User already exists as ${existing.role}` });
    }

    let finalUsername = (username || "").trim();
    if (!finalUsername) {
      const baseSource =
        firstName && lastName
          ? `${firstName}-${lastName}`
          : email?.split("@")[0] || "user";
      const base = slugify(baseSource) || "user";
      let candidate = base;
      let tries = 0;
      while (tries < 10) {
        const hit = await User.findOne(
          { username: candidate },
          { _id: 1, clerkId: 1 }
        ).lean();
        if (!hit || String(hit.clerkId) === String(clerkId)) break;
        candidate = `${base}-${randomSuffix()}`;
        tries++;
      }
      finalUsername = candidate;
    }

    const setDoc = { clerkId, email, username: finalUsername, role };

    if (role === "client") {
      const min = Number(profile?.budgetMin ?? 100);
      const max = Number(profile?.budgetMax ?? 200);
      const budgetMin = Number.isFinite(min)
        ? Math.max(0, Math.min(5000, min))
        : 100;
      let budgetMax = Number.isFinite(max)
        ? Math.max(0, Math.min(5000, max))
        : 200;
      if (budgetMax <= budgetMin) budgetMax = Math.max(budgetMin + 1, 200);
      Object.assign(setDoc, {
        budget: { min: budgetMin, max: budgetMax },
        location: profile?.location ?? "",
        placement: profile?.placement ?? "",
        size: profile?.size ?? "",
        notes: profile?.notes ?? "",
      });
    } else if (role === "artist") {
      const years = Number(profile?.years ?? 0);
      const baseRate = Number(profile?.baseRate ?? 0);
      Object.assign(setDoc, {
        location: profile?.location ?? "",
        yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
        priceRange: {
          min: Number.isFinite(baseRate) ? baseRate : 0,
          max: Number.isFinite(baseRate) ? baseRate : 0,
        },
        style: Array.isArray(profile?.style) ? profile.style : [],
        bio: profile?.bio ?? "",
      });
      if (rest && typeof rest === "object") Object.assign(setDoc, rest);
    }

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: setDoc },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(user);
  } catch (error) {
    if (error?.code === 11000 && (req.auth?.userId || req.body?.clerkId)) {
      const existing = await User.findOne({
        clerkId: req.auth?.userId || req.body.clerkId,
      });
      return res.status(200).json(existing);
    }
    res.status(500).json({ error: "Failed to sync user" });
  }
};