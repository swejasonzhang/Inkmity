import Review from "../models/Review.js";
import User from "../models/UserBase.js";
import Booking from "../models/Booking.js";

export const addReview = async (req, res) => {
  try {
    const reviewerClerkId = String(req.auth?.userId || req.user?.clerkId || "").trim();
    if (!reviewerClerkId) return res.status(401).json({ error: "Unauthorized" });

    const body = req.body || {};
    const artistClerkId = String(body.artistClerkId || body.artistId || "").trim();
    const bookingId = body.bookingId;
    const rating = Number(body.rating);
    const comment = String(body.text ?? body.comment ?? "").trim();
    const recommend = Boolean(body.recommend);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "invalid_rating" });
    }
    if (!bookingId) {
      return res.status(400).json({
        error: "booking_required",
        message: "Reviews must be tied to a completed appointment.",
      });
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return res.status(404).json({ error: "booking_not_found" });

    if (String(booking.clientId) !== reviewerClerkId) {
      return res.status(403).json({ error: "not_your_booking" });
    }
    if (artistClerkId && String(booking.artistId) !== artistClerkId) {
      return res.status(400).json({ error: "artist_mismatch" });
    }
    if (booking.status !== "completed") {
      return res.status(403).json({
        error: "not_completed",
        message: "You can review once your session is completed.",
      });
    }

    const existing = await Review.findOne({ bookingId });
    if (existing) {
      return res.status(409).json({
        error: "already_reviewed",
        message: "You've already reviewed this appointment.",
      });
    }

    const [reviewer, artist] = await Promise.all([
      User.findOne({ clerkId: reviewerClerkId }).lean(),
      User.findOne({ clerkId: String(booking.artistId), role: "artist" }),
    ]);
    if (!artist) return res.status(404).json({ error: "Artist not found" });
    if (!reviewer) return res.status(404).json({ error: "reviewer_not_found" });

    const review = await Review.create({
      reviewer: reviewer._id,
      artist: artist._id,
      bookingId,
      rating,
      comment,
      recommend,
    });

    const agg = await Review.aggregate([
      { $match: { artist: artist._id } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const stats = agg[0] || { avg: rating, count: 1 };
    artist.rating = Math.round(stats.avg * 10) / 10;
    artist.reviewsCount = stats.count;
    if (Array.isArray(artist.reviews) && !artist.reviews.some((r) => String(r) === String(review._id))) {
      artist.reviews.push(review._id);
    }
    await artist.save();

    res.status(201).json(review);
  } catch (error) {
    console.error("addReview error:", error);
    res.status(500).json({ error: "Failed to add review" });
  }
};
