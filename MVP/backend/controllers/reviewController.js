import Review from "../models/Review.js";
import Artist from "../models/Artist.js";

export const addReview = async (req, res) => {
  try {
    const { artistId, rating, comment } = req.body;
    const reviewerId = req.auth.userId;

    const review = await Review.create({
      reviewer: reviewerId,
      artist: artistId,
      rating,
      comment,
    });

    const artist = await Artist.findById(artistId).populate("reviews");
    artist.reviews.push(review._id);
    const total = artist.reviews.reduce((acc, r) => acc + r.rating, 0) + rating;
    artist.rating = total / (artist.reviews.length + 1);
    await artist.save();

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: "Failed to add review" });
  }
};
