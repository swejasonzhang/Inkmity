import User from "./UserBase.js";
import mongoose from "mongoose";
const { Schema } = mongoose;

const ArtistSchema = new Schema(
  {
    location: { type: String },
    shop: { type: String },
    styles: [{ type: String, index: true }],
    bio: { type: String },
    priceRange: { min: Number, max: Number },
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
  },
  { timestamps: true }
);

export default mongoose.models.Artist ||
  User.discriminator("artist", ArtistSchema);