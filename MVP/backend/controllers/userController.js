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
      .select("username email role location style priceRange rating reviews")
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
      .select("username email role location style priceRange rating reviews")
      .populate("reviews");

    if (!artist) return res.status(404).json({ error: "Artist not found" });

    res.status(200).json(artist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch artist" });
  }
};