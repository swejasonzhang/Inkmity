import Artist from "../models/Artist.js";
import User from "../models/User.js";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const featuredArtists = await Artist.find().sort({ rating: -1 }).limit(5);

    res.status(200).json({ user, featuredArtists });
  } catch (error) {
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
};
