import { getAuth } from "@clerk/express";
import Artist from "../models/Artist.js";
import ArtworkLike from "../models/ArtworkLike.js";

const key = (artistClerkId, url) => `${artistClerkId}|${url}`;

function actorId(req) {
  try {
    return String(getAuth(req)?.userId || req.user?.clerkId || req.auth?.userId || "");
  } catch {
    return String(req.user?.clerkId || req.auth?.userId || "");
  }
}

export async function getPopularArtworks(req, res) {
  try {
    const limit = Math.min(120, Math.max(1, Number(req.query.limit) || 60));
    const me = actorId(req);

    const artists = await Artist.find({ role: "artist", visible: true })
      .select("clerkId handle username avatar styles rating verified portfolioImages pastWorks healedWorks sketches")
      .lean();

    const artworks = [];
    for (const a of artists) {
      const urls = [
        ...(a.portfolioImages || []),
        ...(a.pastWorks || []),
        ...(a.healedWorks || []),
        ...(a.sketches || []),
      ].filter(Boolean);
      const seen = new Set();
      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        artworks.push({
          artistClerkId: a.clerkId,
          handle: (a.handle || "").replace(/^@/, ""),
          username: a.username,
          avatarUrl: a.avatar?.url || null,
          verified: !!a.verified,
          styles: a.styles || [],
          rating: Number(a.rating || 0),
          url,
        });
      }
    }

    const counts = await ArtworkLike.aggregate([
      { $group: { _id: { a: "$artistClerkId", u: "$imageUrl" }, c: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((r) => [key(r._id.a, r._id.u), r.c]));

    let mine = new Set();
    if (me) {
      const liked = await ArtworkLike.find({ userClerkId: me }).select("artistClerkId imageUrl").lean();
      mine = new Set(liked.map((l) => key(l.artistClerkId, l.imageUrl)));
    }

    const items = artworks.map((w) => {
      const k = key(w.artistClerkId, w.url);
      return { ...w, likes: countMap.get(k) || 0, likedByMe: mine.has(k) };
    });

    items.sort((x, y) => (y.likes - x.likes) || (y.rating - x.rating) || x.url.localeCompare(y.url));

    res.json({ items: items.slice(0, limit) });
  } catch (e) {
    console.error("getPopularArtworks error:", e.message);
    res.status(500).json({ error: "popular_failed" });
  }
}

export async function toggleArtworkLike(req, res) {
  try {
    const me = actorId(req);
    if (!me) return res.status(401).json({ error: "Unauthorized" });
    const artistClerkId = String(req.body?.artistClerkId || "").trim();
    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!artistClerkId || !imageUrl) return res.status(400).json({ error: "artistClerkId and imageUrl required" });

    const existing = await ArtworkLike.findOne({ userClerkId: me, artistClerkId, imageUrl });
    let liked;
    if (existing) {
      await ArtworkLike.deleteOne({ _id: existing._id });
      liked = false;
    } else {
      try {
        await ArtworkLike.create({ userClerkId: me, artistClerkId, imageUrl });
      } catch (err) {
        if (err?.code !== 11000) throw err;
      }
      liked = true;
    }
    const likes = await ArtworkLike.countDocuments({ artistClerkId, imageUrl });
    res.json({ liked, likes });
  } catch (e) {
    console.error("toggleArtworkLike error:", e.message);
    res.status(500).json({ error: "like_failed" });
  }
}
