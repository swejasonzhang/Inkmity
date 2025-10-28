import mongoose from "mongoose";
import User from "./UserBase.js";

const { Schema } = mongoose;

const ArtistSchema = new Schema(
  {
    shop: String,
    styles: [{ type: String, index: true }],
    rating: { type: Number, default: 0, index: true },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    reviewsCount: { type: Number, default: 0, index: true },
    yearsExperience: { type: Number, default: 0, min: 0, index: true },
    bookingsCount: { type: Number, default: 0 },
    bookingPreference: {
      type: String,
      enum: ["open", "waitlist", "closed", "referral", "guest"],
      default: "open",
    },
    travelFrequency: {
      type: String,
      enum: ["rare", "sometimes", "often", "touring", "guest_only"],
      default: "rare",
    },
    baseRate: { type: Number, default: 0 },
    portfolioImages: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.artist ||
  User.discriminator("artist", ArtistSchema);