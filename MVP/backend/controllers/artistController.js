import Artist from "../models/Artist.js";

export const getArtists = async (req, res) => {
  try {
    const { location, style, minPrice, maxPrice, minRating } = req.query;

    const filter = {};
    if (location) filter.location = location;
    if (style) filter.style = { $in: [style] };
    if (minPrice) filter["priceRange.min"] = { $gte: Number(minPrice) };
    if (maxPrice) filter["priceRange.max"] = { $lte: Number(maxPrice) };
    if (minRating) filter.rating = { $gte: Number(minRating) };

    const artists = await Artist.find(filter).populate("reviews");
    res.status(200).json(artists);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch artists" });
  }
};

export const getArtistById = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).populate("reviews");
    if (!artist) return res.status(404).json({ error: "Artist not found" });
    res.status(200).json(artist);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch artist" });
  }
};
