import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: "Profile photo" },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },

    role: {
      type: String,
      enum: ["client", "artist"],
      default: "client",
      required: true,
      index: true,
    },

    avatar: { type: ImageSchema },
    location: { type: String },
    style: [{ type: String }],
    bio: { type: String },
    priceRange: { min: Number, max: Number },
    rating: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

    bookingsCount: { type: Number, default: 0 },
    totalBookingFeesPaid: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    freeTattooEligibleUnderUSD: { type: Number, default: 0 },
    lastRewardAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  if (this.clerkImageUrl) return this.clerkImageUrl;
  return "https://stock.adobe.com/search?k=default+profile+picture&asset_id=589932782";
};

export default mongoose.model("User", userSchema);