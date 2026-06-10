import { v2 as cloudinary } from "cloudinary";
import Image from "../models/Image.js";
import User from "../models/UserBase.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const kindToFolder = (k) =>
  k === "artist_portfolio" ? "inkmity/portfolio" : "inkmity/references";
const kindToEnum = (k) =>
  k === "artist_portfolio" ? "portfolio" : "reference";

export const signUpload = (req, res) => {
  const kind =
    (req.method === "GET" ? req.query.kind : req.body.kind) || "client_ref";
  const folder =
    (req.method === "GET" ? req.query.folder : req.body.folder) ||
    kindToFolder(kind);
  const tags =
    (req.method === "GET" ? req.query.tags : req.body.tags) ||
    (kind === "artist_portfolio" ? ["portfolio"] : ["reference"]);
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder,
    tags: Array.isArray(tags) ? tags.join(",") : tags,
  };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
    tags: paramsToSign.tags,
  });
};

export const saveImages = async (req, res) => {
  const { userId, role, kind, files, tags } = req.body || {};
  if (!userId || !role || !kind || !Array.isArray(files))
    return res.status(400).json({ error: "bad_request" });

  const docs = files.map((f) => ({
    userId,
    role,
    kind: kindToEnum(kind),
    publicId: f.public_id,
    url: f.secure_url || f.url,
    width: f.width,
    height: f.height,
    bytes: f.bytes,
    format: f.format,
    tags: Array.isArray(tags) ? tags : Array.isArray(f.tags) ? f.tags : [],
  }));

  try {
    const created = await Image.insertMany(docs, { ordered: false });
    if (kindToEnum(kind) === "reference" && role === "client") {
      const urls = created.map((d) => d.url).filter(Boolean);
      if (urls.length) {
        await User.updateOne(
          { clerkId: userId },
          { $addToSet: { references: { $each: urls } } },
          { upsert: false }
        );
      }
    }
    return res.json({ ok: true, count: created.length });
  } catch {
    return res.json({ ok: true, count: 0 });
  }
};

export const listImages = async (req, res) => {
  const { userId, role, kind, limit = 60, cursor } = req.query;
  const q = {};
  if (userId) q.userId = userId;
  if (role) q.role = role;
  if (kind) q.kind = kindToEnum(kind);
  if (cursor) q._id = { $lt: cursor };
  const items = await Image.find(q).sort({ _id: -1 }).limit(Number(limit));
  const nextCursor = items.length ? items[items.length - 1]._id : null;
  res.json({ items, nextCursor });
};

export const deleteImage = async (req, res) => {
  const { id } = req.params;
  const doc = await Image.findById(id);
  if (!doc) return res.status(404).json({ error: "not_found" });
  try {
    await cloudinary.uploader.destroy(doc.publicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch {}
  await Image.deleteOne({ _id: id });
  if (
    doc.kind === "reference" &&
    doc.role === "client" &&
    doc.userId &&
    doc.url
  ) {
    await User.updateOne(
      { clerkId: doc.userId },
      { $pull: { references: doc.url } }
    );
  }
  res.json({ ok: true });
};