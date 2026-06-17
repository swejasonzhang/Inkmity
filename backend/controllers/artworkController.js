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
      .select("clerkId handle username avatar styles rating bookingsCount portfolioImages portfolioMeta pastWorks healedWorks sketches")
      .lean();

    const artworks = [];
    for (const a of artists) {
      const ideaByUrl = new Map(
        (a.portfolioMeta || []).filter((m) => m?.url && m?.idea).map((m) => [m.url, m.idea])
      );
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
          verified: (a.bookingsCount || 0) >= 5,
          styles: a.styles || [],
          rating: Number(a.rating || 0),
          url,
          idea: ideaByUrl.get(url) || "",
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

export async function getTrendingIdeas(req, res) {
  try {
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
    const artists = await Artist.find({ role: "artist", visible: true })
      .select("portfolioMeta")
      .lean();

    const byIdea = new Map();
    for (const a of artists) {
      for (const m of a.portfolioMeta || []) {
        const idea = String(m?.idea || "").trim();
        const url = String(m?.url || "").trim();
        if (!idea || !url) continue;
        const norm = idea.toLowerCase();
        const existing = byIdea.get(norm);
        if (existing) {
          existing.count += 1;
        } else {
          byIdea.set(norm, { label: idea, query: idea, image: url, count: 1 });
        }
      }
    }

    const items = [...byIdea.values()]
      .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label))
      .slice(0, limit)
      .map(({ label, query, image }) => ({ label, query, image }));

    res.json({ items });
  } catch (e) {
    console.error("getTrendingIdeas error:", e.message);
    res.status(500).json({ error: "trending_ideas_failed" });
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
