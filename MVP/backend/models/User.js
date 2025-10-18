import mongoose from "mongoose";
const { Schema } = mongoose;

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: "Profile photo" },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const UserSchema = new Schema(
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
    clerkImageUrl: { type: String },

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

    references: { type: [String], default: [] },
  },
  { timestamps: true }
);

UserSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  if (this.clerkImageUrl) return this.clerkImageUrl;
  return "https://stock.adobe.com/search?k=default+profile+picture&asset_id=589932782";
};

export default mongoose.models.User || mongoose.model("User", UserSchema);