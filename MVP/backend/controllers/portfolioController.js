import PortfolioImage from "../models/PortfolioImage.js";
import User from "../models/User.js";

export async function getPortfolioUploadSignature(req, res) {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const me = await User.findOne({ clerkId });
    if (!me || me.role !== "artist")
      return res.status(403).json({ error: "Artist only" });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `portfolio/${me._id}`;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
    const apiKey = process.env.CLOUDINARY_API_KEY || "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: "cloudinary_env_not_configured" });
    }

    const { v2: cloudinary } = await import("cloudinary");
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret
    );

    res.json({ signature, timestamp, apiKey, cloudName, folder });
  } catch {
    res.status(500).json({ error: "signature_failed" });
  }
}

export async function createPortfolioItems(req, res) {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const me = await User.findOne({ clerkId });
    if (!me || me.role !== "artist")
      return res.status(403).json({ error: "Artist only" });

    const items = Array.isArray(req.body?.items)
      ? req.body.items
      : [req.body?.item].filter(Boolean);
    if (!items.length) return res.status(400).json({ error: "No items" });

    const docs = items.map((i) => ({
      artistId: me._id,
      url: i.url,
      publicId: i.publicId,
      width: i.width,
      height: i.height,
      format: i.format,
      bytes: i.bytes,
      caption: i.caption,
      tags: Array.isArray(i.tags) ? i.tags : [],
      isCover: Boolean(i.isCover),
      albumId: i.albumId || undefined,
      albumName: i.albumName || undefined,
    }));

    const created = await PortfolioImage.insertMany(docs, { ordered: false });
    res.status(201).json({ items: created });
  } catch {
    res.status(500).json({ error: "create_portfolio_failed" });
  }
}

export async function listArtistPortfolio(req, res) {
  try {
    const { artistId } = req.params;
    const {
      limit = "24",
      cursor,
      tag,
      albumId,
      includeDeleted = "false",
    } = req.query;

    const q = {
      artistId,
      ...(includeDeleted !== "true" ? { deletedAt: { $exists: false } } : {}),
    };
    if (tag) q.tags = tag;
    if (albumId) q.albumId = albumId;

    if (cursor) {
      const [ts, id] = cursor.split("_");
      const tsDate = new Date(Number(ts));
      q.$or = [
        { createdAt: { $lt: tsDate } },
        { createdAt: tsDate, _id: { $lt: id } },
      ];
    }

    const pageSize = Math.min(120, Math.max(1, parseInt(String(limit), 10)));
    const items = await PortfolioImage.find(q)
      .sort({ createdAt: -1, _id: -1 })
      .limit(pageSize + 1)
      .lean();

    let nextCursor = null;
    if (items.length > pageSize) {
      const last = items[pageSize - 1];
      nextCursor = `${new Date(last.createdAt).getTime()}_${last._id}`;
      items.splice(pageSize);
    }

    res.json({ items, nextCursor });
  } catch {
    res.status(500).json({ error: "list_portfolio_failed" });
  }
}

export async function updatePortfolioItem(req, res) {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const me = await User.findOne({ clerkId });
    if (!me || me.role !== "artist")
      return res.status(403).json({ error: "Artist only" });

    const { id } = req.params;
    const { caption, tags, isCover, albumId, albumName } = req.body || {};

    const item = await PortfolioImage.findOne({ _id: id, artistId: me._id });
    if (!item) return res.status(404).json({ error: "not_found" });

    if (typeof caption === "string") item.caption = caption;
    if (Array.isArray(tags)) item.tags = tags;
    if (typeof isCover === "boolean") item.isCover = isCover;
    if (albumId !== undefined) item.albumId = albumId || undefined;
    if (albumName !== undefined) item.albumName = albumName || undefined;

    if (item.isCover) {
      await PortfolioImage.updateMany(
        { artistId: me._id, _id: { $ne: item._id } },
        { $set: { isCover: false } }
      );
    }

    await item.save();
    res.json(item);
  } catch {
    res.status(500).json({ error: "update_portfolio_failed" });
  }
}

export async function deletePortfolioItem(req, res) {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const me = await User.findOne({ clerkId });
    if (!me || me.role !== "artist")
      return res.status(403).json({ error: "Artist only" });

    const { id } = req.params;
    const item = await PortfolioImage.findOne({ _id: id, artistId: me._id });
    if (!item) return res.status(404).json({ error: "not_found" });

    item.deletedAt = new Date();
    await item.save();

    try {
      const { default: cloudinary } = await import("../lib/cloudinary.js");
      await cloudinary.uploader.destroy(item.publicId);
    } catch {}

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "delete_portfolio_failed" });
  }
}