import User from "../models/User.js";

export const getMe = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const me = await User.findOne({ clerkId: userId }).lean();
  if (!me) return res.status(404).json({ error: "User not found" });
  res.json(me);
};

export const updateMyAvatar = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const {
      url,
      publicId,
      width,
      height,
      format,
      bytes,
      alt = "Profile photo",
    } = req.body || {};

    if (!url) return res.status(400).json({ error: "Missing image url" });

    const updated = await User.findOneAndUpdate(
      { clerkId },
      { avatar: { url, publicId, width, height, format, bytes, alt } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({ avatar: updated.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update avatar" });
  }
};

export const deleteMyAvatar = async (req, res) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const publicId = user.avatar?.publicId;
    user.avatar = undefined;
    await user.save();

    if (publicId) {
      const { default: cloudinary } = await import("../lib/cloudinary.js");
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.warn("Cloudinary destroy failed:", e?.message || e);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete avatar" });
  }
};

export const syncUser = async (req, res) => {
  try {
    const { clerkId, email, role, username, ...rest } = req.body || {};
    if (!clerkId || !email || !role || !username) {
      return res
        .status(400)
        .json({ error: "clerkId, email, role, username are required" });
    }

    const base = { clerkId, email, role, username };
    const updateDoc = role === "client" ? base : { ...base, ...rest };

    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: updateDoc },
      { new: true, upsert: true }
    );

    res.status(200).json(user);
  } catch (error) {
    if (error?.code === 11000 && req.body?.clerkId) {
      const existing = await User.findOne({ clerkId: req.body.clerkId });
      return res.status(200).json(existing);
    }
    console.error(error);
    res.status(500).json({ error: "Failed to sync user" });
  }
};

export const getArtists = async (req, res) => {
  try {
    const {
      search = "",
      location,
      style,
      minPrice,
      maxPrice,
      priceMin,
      priceMax,
      minRating,
      minExperience,
      maxExperience,
      page = "1",
      pageSize = "12",
      sort = "rating_desc",
      includeReviews = "false",
      topRated = "false",
    } = req.query;

    const q = { role: "artist" };

    if (location) q.location = location;
    if (style) q.style = { $in: [style] };

    const min = minPrice ?? priceMin;
    const max = maxPrice ?? priceMax;
    if (min || max) {
      const and = [];
      if (min) and.push({ "priceRange.max": { $gte: Number(min) } });
      if (max) and.push({ "priceRange.min": { $lte: Number(max) } });
      if (and.length) q.$and = (q.$and || []).concat(and);
    }

    if (minRating) q.rating = { $gte: Number(minRating) };

    if (minExperience || maxExperience) {
      q.yearsExperience = {};
      if (minExperience) q.yearsExperience.$gte = Number(minExperience);
      if (maxExperience) q.yearsExperience.$lte = Number(maxExperience);
    }

    if (topRated === "true" && !minRating) {
      q.rating = { $gte: 4.5 };
    }

    if (search) {
      const rx = new RegExp(String(search), "i");
      q.$or = [{ username: rx }, { location: rx }, { bio: rx }, { style: rx }];
    }

    const sortMap = {
      rating_desc: { rating: -1, reviewsCount: -1 },
      rating_asc: { rating: 1 },
      newest: { createdAt: -1 },
      experience_desc: { yearsExperience: -1, rating: -1 },
      experience_asc: { yearsExperience: 1 },
      highly_rated: { rating: -1, reviewsCount: -1 },
    };
    const sortSpec = sortMap[sort] || sortMap.rating_desc;

    const p = Math.max(1, parseInt(page));
    const ps = Math.min(48, Math.max(1, parseInt(pageSize)));

    const baseQuery = User.find(q)
      .select(
        "clerkId username email role location style bio priceRange rating reviews reviewsCount yearsExperience avatar"
      )
      .sort(sortSpec)
      .skip((p - 1) * ps)
      .limit(ps)
      .lean();

    const query =
      includeReviews === "true" ? baseQuery.populate("reviews") : baseQuery;

    const [items, total] = await Promise.all([query, User.countDocuments(q)]);
    res.status(200).json({ items, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
};

export const getArtistById = async (req, res) => {
  try {
    const artist = await User.findOne({ _id: req.params.id, role: "artist" })
      .select(
        "clerkId username email role location style bio priceRange rating reviews reviewsCount yearsExperience avatar"
      )
      .populate("reviews");

    if (!artist) return res.status(404).json({ error: "Artist not found" });
    res.status(200).json(artist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artist" });
  }
};