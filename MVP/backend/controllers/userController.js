import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";

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
        budget: { min: budgetMin, max: budgetMax }, // <-- matches Client schema
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