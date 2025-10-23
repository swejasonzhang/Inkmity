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
  const clerkId = getClerkId(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  const me = await User.findOne({ clerkId }).lean();
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

function parseExp(q) {
  const s = String(q || "")
    .trim()
    .toLowerCase();
  if (!s || s === "all") return {};
  if (s.endsWith("+")) {
    const n = Number(s.slice(0, -1));
    return Number.isFinite(n) ? { $gte: n } : {};
  }
  const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) return { $gte: a, $lte: b };
  }
  return {};
}

export async function getArtists(req, res) {
  const Artist = mongoose.model("artist");

  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.max(1, Math.min(48, Number(req.query.pageSize || 12)));
  const sortKey = String(req.query.sort || "rating_desc");

  const search = String(req.query.search || "").trim();
  const location = String(req.query.location || "").trim();
  const style = String(req.query.style || "").trim();
  const booking = String(req.query.booking || "").trim();
  const travel = String(req.query.travel || "").trim();
  const experience = parseExp(req.query.experience);

  const filter = {};

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    Object.assign(filter, {
      $or: [{ username: rx }, { bio: rx }, { location: rx }, { styles: rx }],
    });
  }
  if (location)
    Object.assign(filter, { location: new RegExp(`^${location}$`, "i") });
  if (style) Object.assign(filter, { styles: style });
  if (booking) Object.assign(filter, { bookingPreference: booking });
  if (travel) Object.assign(filter, { travelFrequency: travel });
  if (Object.keys(experience).length)
    Object.assign(filter, { yearsExperience: experience });

  const sort = (() => {
    if (sortKey === "experience_desc")
      return { yearsExperience: -1, rating: -1 };
    if (sortKey === "experience_asc") return { yearsExperience: 1, rating: -1 };
    if (sortKey === "newest") return { createdAt: -1 };
    if (sortKey === "rating_asc") return { rating: 1, reviewsCount: -1 };
    return { rating: -1, reviewsCount: -1, createdAt: -1 };
  })();

  const [total, items] = await Promise.all([
    Artist.countDocuments(filter),
    Artist.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select(
        "_id username role location shop styles yearsExperience baseRate bookingPreference travelFrequency rating reviewsCount createdAt"
      )
      .lean(),
  ]);

  res.json({ items, total, page, pageSize });
}

export async function getArtistById(req, res) {
  const { id } = req.params;
  const Artist = mongoose.model("artist");
  const doc = await Artist.findById(id).lean();
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(doc);
}

export async function checkUsernameAvailability(req, res) {
  const raw = String(req.query.u || "").trim();
  if (!raw)
    return res.status(400).json({ ok: false, error: "username_required" });
  const candidate = slugify(raw);
  if (!candidate)
    return res.status(400).json({ ok: false, error: "invalid_username" });
  const hit = await User.findOne({ username: candidate }, { _id: 1 }).lean();
  return res.json({ ok: true, available: !hit, username: candidate });
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
    if (!clerkId || !email || !rawRole)
      return res
        .status(400)
        .json({ error: "clerkId, email, role are required" });

    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";
    const existing = await User.findOne({ clerkId }).lean();
    const requestedUsername = String(username || "").trim();
    if (!existing && !requestedUsername)
      return res.status(400).json({ error: "username_required" });

    let finalUsername = requestedUsername
      ? slugify(requestedUsername)
      : existing?.username;
    if (!finalUsername)
      return res.status(400).json({ error: "invalid_username" });

    const nameOwner = await User.findOne(
      { username: finalUsername },
      { clerkId: 1 }
    ).lean();
    if (nameOwner && String(nameOwner.clerkId) !== String(clerkId)) {
      return res
        .status(409)
        .json({ error: "username_taken", username: finalUsername });
    }

    if (existing && existing.role && existing.role !== role) {
      return res
        .status(409)
        .json({ error: `User already exists as ${existing.role}` });
    }

    const setDoc = { clerkId, email, username: finalUsername, role };

    if (role === "client") {
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

    const Model =
      role === "client" ? mongoose.model("client") : mongoose.model("artist");
    const user = await Model.findOneAndUpdate(
      { clerkId },
      { $set: setDoc },
      {
        new: true,
        upsert: !existing,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to sync user" });
  }
}