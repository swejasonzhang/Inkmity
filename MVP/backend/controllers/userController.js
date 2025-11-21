import mongoose from "mongoose";
import User from "../models/UserBase.js";
import "../models/Client.js";
import "../models/Artist.js";
import cloudinary from "../lib/cloudinary.js";
import { ensureUniqueHandle, isValidHandle } from "../lib/handle.js";

const SAFE_ROLES = new Set(["client", "artist"]);

const authObj = (req) =>
  typeof req.auth === "function" ? req.auth() : req.auth;
function getClerkId(req) {
  try {
    const a = authObj(req);
    return (
      a?.userId ||
      req.user?.clerkId ||
      req.headers["x-clerk-user-id"] ||
      req.body?.clerkId ||
      req.query?.clerkId ||
      null
    );
  } catch {
    return (
      req.user?.clerkId ||
      req.headers["x-clerk-user-id"] ||
      req.body?.clerkId ||
      req.query?.clerkId ||
      null
    );
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

const cleanBio = (s) =>
  typeof s === "string"
    ? s.trim().replace(/\s+/g, " ").slice(0, 600)
    : undefined;
const stripToHandleBase = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "");
const withAt = (s = "") => (s.startsWith("@") ? s : `@${s}`);

export const bioText = (username, bio) =>
  (typeof bio === "string" && bio.trim()) ||
  `Nice to meet you, I'm ${
    username || "this artist"
  }, let's talk about your next tattoo.`;

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
    const urls = (Array.isArray(req.body?.urls) ? req.body.urls : [])
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const Client = mongoose.model("client");
    const user = await Client.findOneAndUpdate(
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
  const sort =
    sortKey === "experience_desc"
      ? { yearsExperience: -1, rating: -1 }
      : sortKey === "experience_asc"
      ? { yearsExperience: 1, rating: -1 }
      : sortKey === "newest"
      ? { createdAt: -1 }
      : sortKey === "rating_asc"
      ? { rating: 1, reviewsCount: -1 }
      : { rating: -1, reviewsCount: -1, createdAt: -1 };
  const [total, items] = await Promise.all([
    Artist.countDocuments(filter),
    Artist.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select(
        "_id clerkId username handle role location shop styles yearsExperience baseRate bookingPreference travelFrequency rating reviewsCount bookingsCount createdAt bio portfolioImages"
      )
      .lean(),
  ]);
  res.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function getArtistById(req, res) {
  const { id } = req.params;
  const Artist = mongoose.model("artist");
  const doc = await Artist.findById(id).lean();
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(doc);
}

export async function checkHandleAvailability(req, res) {
  const raw = String(req.query.h || "").trim();
  const base = stripToHandleBase(raw);
  if (!base)
    return res.status(400).json({ ok: false, error: "handle_required" });
  if (!isValidHandle(base))
    return res
      .status(200)
      .json({ ok: true, available: false, handle: withAt(base) });
  const publicHandle = withAt(base);
  const available = !(await User.findOne(
    { handle: publicHandle },
    { _id: 1 }
  ).lean());
  res.json({ ok: true, available, handle: publicHandle });
}

export async function syncUser(req, res) {
  try {
    const authClerkId = getClerkId(req);
    const {
      clerkId: bodyClerkId,
      email,
      role: rawRole,
      handle,
      username: bodyUsername,
      profile = {},
      bio: bodyBio,
    } = req.body || {};
    const clerkId = authClerkId || bodyClerkId;
    if (!clerkId || !email || !rawRole)
      return res
        .status(400)
        .json({ error: "clerkId, email, role are required" });
    const role = SAFE_ROLES.has(rawRole) ? rawRole : "client";
    const existing = await User.findOne({ clerkId }).lean();
    const finalUsername =
      String(bodyUsername || "").trim() || existing?.username || "user";
    let targetHandle = existing?.handle;
    if (!targetHandle) {
      const baseForHandle =
        stripToHandleBase(handle) ||
        stripToHandleBase(finalUsername) ||
        stripToHandleBase(email.split("@")[0] || "user");
      const ensuredBase = await ensureUniqueHandle(
        mongoose.connection.db,
        baseForHandle
      );
      targetHandle = withAt(ensuredBase);
    }
    const bio = cleanBio(bodyBio ?? profile.bio) || "";
    const normalizedStyles = Array.isArray(profile.styles)
      ? profile.styles
      : typeof profile.style === "string" && profile.style.trim()
      ? [profile.style.trim()]
      : [];
    const styles = normalizedStyles
      .map((s) => String(s || "").trim())
      .filter(Boolean);
    const setDoc = {
      clerkId,
      email,
      username: finalUsername,
      handle: targetHandle,
      role,
      bio,
      ...(styles.length ? { styles } : {}),
    };
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
      const refs = (
        Array.isArray(profile.referenceImages) ? profile.referenceImages : []
      )
        .map((u) => String(u || "").trim())
        .filter(Boolean)
        .slice(0, 3);
      Object.assign(setDoc, {
        budgetMin,
        budgetMax,
        location: profile.location ?? "",
        placement: profile.placement ?? "",
        size: profile.size ?? "",
        ...(refs.length ? { references: refs } : {}),
      });
    } else {
      const years = Number(profile.years ?? profile.yearsExperience ?? 0);
      const baseRate = Number(profile.baseRate ?? 0);
      const bookingPreference = profile.bookingPreference || "open";
      const travelFrequency = profile.travelFrequency || "rare";
      const shop = profile.shop || "";
      const coverImage = profile.coverImage || "";
      const portfolio = (
        Array.isArray(profile.portfolioImages) ? profile.portfolioImages : []
      )
        .map((u) => String(u || "").trim())
        .filter(Boolean)
        .slice(0, 3);
      Object.assign(setDoc, {
        location: profile.location ?? "",
        shop,
        yearsExperience: Number.isFinite(years) ? Math.max(0, years) : 0,
        baseRate: Number.isFinite(baseRate) ? Math.max(0, baseRate) : 0,
        bookingPreference,
        travelFrequency,
        ...(coverImage ? { coverImage } : {}),
        ...(portfolio.length ? { portfolioImages: portfolio } : {}),
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
    ).lean();
    res.status(200).json(user);
  } catch (e) {
    console.error("[syncUser] failed:", e);
    res
      .status(500)
      .json({ error: "SYNC_FAILED", message: e?.message || String(e) });
  }
}

export async function updateMyBio(req, res) {
  const clerkId = getClerkId(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  const bio = cleanBio(req.body?.bio) || "";
  const user = await User.findOneAndUpdate(
    { clerkId },
    { $set: { bio } },
    { new: true }
  ).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true, bio: user.bio });
}

export async function getMyDefaultBio(req, res) {
  const clerkId = getClerkId(req);
  if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
  const user = await User.findOne({ clerkId }).select("username bio").lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ text: bioText(user.username, user.bio) });
}

export async function saveMyPortfolio(req, res) {
  try {
    const clerkId = getClerkId(req);
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });
    const urls = (Array.isArray(req.body?.urls) ? req.body.urls : [])
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      .slice(0, 3);
    const Artist = mongoose.model("artist");
    const user = await Artist.findOneAndUpdate(
      { clerkId },
      { $set: { portfolioImages: urls } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, portfolioImages: user.portfolioImages || [] });
  } catch {
    res.status(500).json({ error: "save_portfolio_failed" });
  }
}