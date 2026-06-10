import Review from "../models/Review.js";
import User from "../models/UserBase.js";

export const addReview = async (req, res) => {
  try {
    const { artistId, rating, text, comment, bookingId } = req.body;
    const reviewerId = req.auth.userId;

    const review = await Review.create({
      reviewer: reviewerId,
      artist: artistId,
      bookingId: bookingId || undefined,
      rating,
      comment: text || comment || "",
    });

    const artist = await User.findOne({ _id: artistId, role: "artist" }).populate("reviews");
    if (!artist) {
      return res.status(404).json({ error: "Artist not found" });
    }

    artist.reviews.push(review._id);

    const populatedReviews = await Review.find({ _id: { $in: artist.reviews } });
    const total = populatedReviews.reduce((acc, r) => acc + r.rating, 0);
    artist.rating = total / populatedReviews.length;

    await artist.save();

    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add review" });
  }
};