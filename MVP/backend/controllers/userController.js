import mongoose from "mongoose";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cloudinary from "../lib/cloudinary.js";

const authObj = (req) =>
  typeof req.auth === "function" ? req.auth() : req.auth;
const getClerkId = (req) => authObj(req)?.userId || null;
const SAFE_ROLES = new Set(["client", "artist"]);

const slugify = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 24);

function randomSuffix(n = 4) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < n; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function getMe(req, res) {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const me = await User.findOne({ clerkId }).lean();
    if (!me) return res.status(404).json({ error: "Not found" });
    return res.json(me);
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "internal" });
  }
}

export async function getAvatarSignature(_req, res) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/avatars";
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );
    return res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    console.error("getAvatarSignature error:", err);
    return res.status(500).json({ error: "signature_failed" });
  }
}

export async function updateMyAvatar(req, res) {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const { url, publicId, alt, width, height } = req.body || {};
    if (!url) return res.status(400).json({ error: "url_required" });
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: { avatar: { url, publicId, alt, width, height } } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    console.error("updateMyAvatar error:", err);
    return res.status(500).json({ error: "update_avatar_failed" });
  }
}

export async function deleteMyAvatar(req, res) {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const publicId = user.avatar?.publicId;
    user.avatar = undefined;
    await user.save();
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("cloudinary destroy failed:", err?.message || err);
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteMyAvatar error:", err);
    return res.status(500).json({ error: "delete_avatar_failed" });
  }
}

export async function getReferenceSignature(_req, res) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/references";
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );
    return res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    console.error("getReferenceSignature error:", err);
    return res.status(500).json({ error: "signature_failed" });
  }
}

export async function saveMyReferences(req, res) {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: { references: urls } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ ok: true, references: user.references || [] });
  } catch (err) {
    console.error("saveMyReferences error:", err);
    return res.status(500).json({ error: "save_references_failed" });
  }
}

export async function getArtists(_req, res) {
  try {
    const Artist = mongoose.model("artist");
    const items = await Artist.find({})
      .sort({ rating: -1, createdAt: -1 })
      .select(
        "_id username role location shop styles yearsExperience baseRate bookingPreference travelFrequency rating reviewsCount"
      )
      .lean();
    return res.json(items);
  } catch (err) {
    console.error("getArtists error:", err);
    return res.status(500).json({ error: "internal" });
  }
}

export async function getArtistById(req, res) {
  try {
    const { id } = req.params;
    const Artist = mongoose.model("artist");
    const doc = await Artist.findById(id).lean();
    if (!doc) return res.status(404).json({ error: "not_found" });
    return res.json(doc);
  } catch (err) {
    console.error("getArtistById error:", err);
    return res.status(500).json({ error: "internal" });
  }
}

export async function syncUser(req, res) {
  try {
    const authClerkId = getClerkId(req);
    const {
      clerkId: bodyClerkId,
      email,
      role: rawRole,
      username,
      firstName,
      lastName,
      profile = {},
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

    let finalUsername = String(username || "").trim();
    if (!finalUsername) {
      const baseSource =
        (firstName && lastName && `${firstName} ${lastName}`) ||
        email.split("@")[0] ||
        "user";
      const base = slugify(baseSource.replace(/\s+/g, "-")) || "user";
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
      finalUsername = candidate || `user-${randomSuffix(6)}`;
    }

    const setDoc = { clerkId, email, username: finalUsername, role };

    let Model;
    if (role === "client") {
      Model = mongoose.model("client");

      const min = Number(profile.budgetMin ?? 100);
      const max = Number(profile.budgetMax ?? 200);
      const budgetMin = Number.isFinite(min)
        ? Math.max(0, Math.min(5000, min))
        : 100;
      let budgetMax = Number.isFinite(max)
        ? Math.max(0, Math.min(5000, max))
        : 200;
      if (budgetMax <= budgetMin) budgetMax = Math.max(budgetMin + 1, 200);

      Object.assign(setDoc, {
        budgetMin,
        budgetMax,
        location: profile.location ?? "",
        placement: profile.placement ?? "",
        size: profile.size ?? "",
      });
    } else {
      Model = mongoose.model("artist");

      const years = Number(profile.years ?? profile.yearsExperience ?? 0);
      const baseRate = Number(profile.baseRate ?? 0);
      const bookingPreference = profile.bookingPreference || "open";
      const travelFrequency = profile.travelFrequency || "rare";
      const shop = profile.shop || "";

      const stylesRaw = Array.isArray(profile.styles)
        ? profile.styles
        : Array.isArray(profile.style)
        ? profile.style
        : [];
      const styles = stylesRaw
        .filter((s) => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean);

      Object.assign(setDoc, {
        location: profile.location ?? "",
        shop,
        yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
        baseRate: Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0,
        bookingPreference,
        travelFrequency,
        styles,
        bio: profile.bio ?? "",
      });
    }

    const user = await Model.findOneAndUpdate(
      { clerkId },
      { $set: setDoc },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json(user);
  } catch (error) {
    console.error("syncUser error:", error);
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ error: "duplicate_key", key: error.keyValue });
    }
    return res.status(500).json({ error: String(error?.message || error) });
  }
}
