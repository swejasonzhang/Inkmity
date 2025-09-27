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
