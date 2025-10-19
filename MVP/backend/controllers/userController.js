import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cloudinary from "../lib/cloudinary.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

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

function buildSetDocFromPayload({
  clerkId,
  email,
  role,
  username,
  firstName,
  lastName,
  profile,
}) {
  const setDoc = { clerkId, email, username, role };
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
      location: profile?.location ?? "",
      placement: profile?.placement ?? "",
      size: profile?.size ?? "",
      notes: profile?.notes ?? "",
    });
  } else if (role === "artist") {
    const years = Number(profile?.years ?? 0);
    const baseRate = Number(profile?.baseRate ?? 0);
    const bookingPreference = profile?.bookingPreference || "open";
    const travelFrequency = profile?.travelFrequency || "rare";
    const shop = profile?.shop || "";
    Object.assign(setDoc, {
      location: profile?.location ?? "",
      shop,
      yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
      baseRate: Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0,
      bookingPreference,
      travelFrequency,
      style: Array.isArray(profile?.style) ? profile.style : [],
      bio: profile?.bio ?? "",
    });
  }
  return setDoc;
}

async function ensureUserDocFromClerk(req) {
  const clerkId = getClerkId(req);
  if (!clerkId) return null;
  const existing = await User.findOne({ clerkId }).lean();
  if (existing) return existing;
  const u = await clerkClient.users.getUser(clerkId);
  const email =
    u?.primaryEmailAddress?.emailAddress ||
    u?.emailAddresses?.[0]?.emailAddress ||
    "";
  const pm = u?.publicMetadata || {};
  const rawRole = pm.role;
  const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";
  const profile = pm.profile || {};
  let finalUsername = String(pm.username || "").trim();
  if (!finalUsername) {
    const baseSource =
      (u.firstName && u.lastName && `${u.firstName}-${u.lastName}`) ||
      email.split("@")[0] ||
      "user";
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
  const setDoc = buildSetDocFromPayload({
    clerkId,
    email,
    role,
    username: finalUsername,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    profile,
  });
  const created = await User.findOneAndUpdate(
    { clerkId },
    { $set: setDoc },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return created;
}

export async function getMe(req, res) {
  const clerkId = getClerkId(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  let me = await User.findOne({ clerkId }).lean();
  if (!me) me = await ensureUserDocFromClerk(req);
  if (!me) return res.status(404).json({ error: "Not found" });
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
  const doc = await User.findOne({ _id: id, role: "artist" }).lean();
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(doc);
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
      profile,
    } = req.body || {};
    const clerkId = authClerkId || bodyClerkId;
    if (!clerkId || !email || !rawRole)
      return res
        .status(400)
        .json({ error: "clerkId, email, role are required" });
    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";
    const existing = await User.findOne({ clerkId }).lean();
    if (existing && existing.role && existing.role !== role)
      return res
        .status(409)
        .json({ error: `User already exists as ${existing.role}` });
    let finalUsername = String(username || "").trim();
    if (!finalUsername) {
      const baseSource =
        (firstName && lastName && `${firstName}-${lastName}`) ||
        email.split("@")[0] ||
        "user";
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
    const setDoc = buildSetDocFromPayload({
      clerkId,
      email,
      role,
      username: finalUsername,
      firstName,
      lastName,
      profile,
    });
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: setDoc },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
    res.status(200).json(user);
  } catch {
    res.status(500).json({ error: "Failed to sync user" });
  }
}