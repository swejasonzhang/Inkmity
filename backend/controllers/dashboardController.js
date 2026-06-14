import User from "../models/UserBase.js";
import Booking from "../models/Booking.js";
import Billing from "../models/Billing.js";
import Artist from "../models/Artist.js";
import { computeArtistTier } from "../services/artistTierService.js";

export const getArtistAnalytics = async (req, res) => {
  try {
    const artistId = req.auth?.userId || req.user?.clerkId;
    if (!artistId) return res.status(401).json({ error: "Unauthorized" });

    const artist = await Artist.findOne({ clerkId: artistId }).lean();
    if (!artist) return res.status(403).json({ error: "Artists only" });

    const bookings = await Booking.find({ artistId }).select("status").lean();
    const counts = bookings.reduce(
      (acc, b) => {
        acc.total += 1;
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      { total: 0 }
    );
    const completed = counts.completed || 0;
    const noShow = counts["no-show"] || 0;
    const cancelled = counts.cancelled || 0;
    const finished = completed + noShow;
    const completionRate = finished > 0 ? completed / finished : 0;

    const earningsAgg = await Billing.aggregate([
      { $match: { artistId: String(artistId), status: "paid" } },
      { $unwind: { path: "$transfers", preserveNullAndEmptyArrays: false } },
      { $match: { "transfers.kind": "artist" } },
      { $group: { _id: null, paidOutCents: { $sum: "$transfers.amountCents" } } },
    ]);
    const paidOutCents = earningsAgg[0]?.paidOutCents || 0;

    const tier = computeArtistTier(artist.bookingsCount, artist.rating);

    res.json({
      tier,
      rating: artist.rating || 0,
      reviewsCount: artist.reviewsCount || 0,
      bookingsCount: artist.bookingsCount || 0,
      bookings: { total: counts.total, completed, noShow, cancelled, completionRate },
      earnings: { paidOutCents },
      payoutSpeed: artist.payoutSpeed || "instant",
    });
  } catch (error) {
    console.error("getArtistAnalytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.auth.userId;

    const user = await User.findOne({ clerkId: userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const featuredArtists = await User.find({ role: "artist" })
      .sort({ rating: -1 })
      .limit(5)
      .select("_id username location style priceRange rating");

    res.status(200).json({ user, featuredArtists });
  } catch (error) {
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
};