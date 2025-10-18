import User from "./UserBase.js";
import mongoose from "mongoose";
const { Schema } = mongoose;

const ArtistSchema = new Schema(
  {
    location: { type: String },
    style: [{ type: String }],
    bio: { type: String },
    priceRange: { min: Number, max: Number },
    rating: { type: Number, default: 0, index: true },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    reviewsCount: { type: Number, default: 0, index: true },
    yearsExperience: { type: Number, default: 0, min: 0, index: true },
    bookingsCount: { type: Number, default: 0 },
    totalBookingFeesPaid: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    freeTattooEligibleUnderUSD: { type: Number, default: 0 },
    lastRewardAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Artist ||
  User.discriminator("artist", ArtistSchema);