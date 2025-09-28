import User from "../models/User.js";

export const getArtists = async (req, res) => {
  try {
    const { location, style, minPrice, maxPrice, minRating } = req.query;

    const filter = { role: "artist" };
    if (location) filter.location = location;
    if (style) filter.style = { $in: [style] };
    if (minPrice) filter["priceRange.min"] = { $gte: Number(minPrice) };
    if (maxPrice) filter["priceRange.max"] = { $lte: Number(maxPrice) };
    if (minRating) filter.rating = { $gte: Number(minRating) };

    const artists = await User.find(filter)
      .select(
        "clerkId username email role location style bio priceRange rating reviews"
      )
      .populate("reviews");

    res.status(200).json(artists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artists" });
  }
};

export const getArtistById = async (req, res) => {
  try {
    const artist = await User.findOne({ _id: req.params.id, role: "artist" })
      .select(
        "clerkId username email role location style bio priceRange rating reviews"
      )
      .populate("reviews");

    if (!artist) return res.status(404).json({ error: "Artist not found" });
    res.status(200).json(artist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artist" });
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

    const update = {
      avatar: {
        url,
        publicId,
        width,
        height,
        format,
        bytes,
        alt,
      },
    };

    const updated = await User.findOneAndUpdate({ clerkId }, update, {
      new: true,
      runValidators: true,
    }).lean();

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
