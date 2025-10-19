import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

const authObj = (req) =>
  typeof req.auth === "function" ? req.auth() : req.auth;
const getClerkId = (req) => authObj(req)?.userId || null;
const SAFE_ROLES = new Set(["client", "artist"]);

function trimStr(v) {
  return typeof v === "string" ? v.trim() : v;
}

function buildUsername(firstName, lastName) {
  const base = `${trimStr(firstName) ?? ""} ${trimStr(lastName) ?? ""}`.trim();
  return base || "User";
}

async function ensureUniqueUsername(desired, selfClerkId) {
  let candidate = desired;
  let n = 1;
  while (true) {
    const hit = await User.findOne(
      { username: candidate },
      { _id: 1, clerkId: 1 }
    ).lean();
    if (!hit || String(hit.clerkId) === String(selfClerkId)) return candidate;
    n += 1;
    candidate = `${desired} (${n})`;
  }
}

export async function getMe(req, res) {
  const clerkId = getClerkId(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  const me = await User.findOne({ clerkId }).lean();
  if (!me) return res.status(200).json({ exists: false });
  res.json(me);
}

export async function getAvatarSignature(_req, res) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/avatars";
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
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
    res.status(500).json({ error: "signature_failed" });
  }
}

export async function updateMyAvatar(req, res) {
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
  res.json(user);
}

export async function deleteMyAvatar(req, res) {
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
    } catch {}
  }
  res.json({ ok: true });
}

export async function getReferenceSignature(_req, res) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "inkmity/references";
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
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
    res.status(500).json({ error: "signature_failed" });
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
    res.json({ ok: true, references: user.references || [] });
  } catch {
    res.status(500).json({ error: "save_references_failed" });
  }
}

export async function getArtists(_req, res) {
  const items = await User.find({ role: "artist" })
    .sort({ rating: -1, createdAt: -1 })
    .select(
      "_id username role location shop yearsExperience baseRate bookingPreference travelFrequency rating"
    )
    .lean();
  res.json(items);
}

export async function getArtistById(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ error: "bad_id" });
  const doc = await User.findOne({ _id: id, role: "artist" }).lean();
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(doc);
}

export async function syncUser(req, res) {
  try {
    const authClerkId = getClerkId(req);
    const {
      clerkId: bodyClerkId,
      email: rawEmail,
      role: rawRole,
      username: rawUsername,
      firstName,
      lastName,
      profile,
    } = req.body || {};

    const email = String(rawEmail || "")
      .trim()
      .toLowerCase();
    const clerkId = authClerkId || bodyClerkId;
    if (!clerkId || !email || !rawRole) {
      return res
        .status(400)
        .json({ error: "clerkId, email, role are required" });
    }

    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";

    const existingByClerk = await User.findOne({ clerkId });
    const existingByEmail = !existingByClerk
      ? await User.findOne({ email })
      : null;
    const existing = existingByClerk || existingByEmail || null;

    let desiredUsername = buildUsername(firstName, lastName);
    if (rawUsername && String(rawUsername).trim())
      desiredUsername = String(rawUsername).trim();
    const finalUsername = await ensureUniqueUsername(desiredUsername, clerkId);

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
        budgetMin,
        budgetMax,
        location: trimStr(profile?.location) ?? "",
        placement: trimStr(profile?.placement) ?? "",
        size: trimStr(profile?.size) ?? "",
        notes: trimStr(profile?.notes) ?? "",
      });
    } else if (role === "artist") {
      const years = Number(profile?.years ?? profile?.yearsExperience ?? 0);
      const baseRate = Number(profile?.baseRate ?? 0);
      const bookingPreference = profile?.bookingPreference || "open";
      const travelFrequency = profile?.travelFrequency || "rare";
      const shop = profile?.shop || "";
      Object.assign(setDoc, {
        location: trimStr(profile?.location) ?? "",
        shop,
        yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
        baseRate: Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0,
        bookingPreference,
        travelFrequency,
        style: Array.isArray(profile?.style) ? profile.style : [],
        bio: trimStr(profile?.bio) ?? "",
      });
    }

    let saved;
    if (existing) {
      if (existing.role && existing.role !== role) {
        return res
          .status(409)
          .json({ error: `User already exists as ${existing.role}` });
      }
      await User.updateOne(
        { _id: existing._id },
        { $set: setDoc },
        { runValidators: true }
      );
      saved = await User.findById(existing._id).lean();
    } else {
      saved = await User.create(setDoc);
      saved = saved.toObject();
    }

    res.status(200).json(saved);
  } catch (error) {
    if (error && error.code === 11000) {
      return res
        .status(409)
        .json({ error: "duplicate_key", details: error.keyValue || {} });
    }
    console.error("[syncUser] failed:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
}