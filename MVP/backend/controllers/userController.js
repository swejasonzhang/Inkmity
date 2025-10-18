import User from "../models/User.js";

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
        const exists = await User.findOne(
          { username: candidate },
          { _id: 1, clerkId: 1 }
        ).lean();
        if (!exists || String(exists.clerkId) === String(clerkId)) break;
        candidate = `${base}-${randomSuffix()}`;
        tries++;
      }
      finalUsername = candidate;
    }

    const baseDoc = { clerkId, email, role, username: finalUsername };

    if (role === "artist" && profile && typeof profile === "object") {
      if (profile.location) baseDoc.location = profile.location;
      if (profile.years) baseDoc.yearsExperience = Number(profile.years) || 0;
      if (profile.baseRate) {
        const rate = Number(profile.baseRate) || 0;
        baseDoc.priceRange = { min: rate, max: rate };
      }
      if (Array.isArray(profile.style)) baseDoc.style = profile.style;
      if (profile.bio) baseDoc.bio = profile.bio;
    }

    const updateDoc = role === "client" ? baseDoc : { ...baseDoc, ...rest };

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: updateDoc },
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