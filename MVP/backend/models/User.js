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
    // Identity
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },

    // Role
    role: {
      type: String,
      enum: ["client", "artist"],
      default: "client",
      required: true,
      index: true,
    },

    // Profile
    avatar: { type: ImageSchema },
    location: { type: String },
    style: [{ type: String }],
    bio: { type: String },
    priceRange: { min: Number, max: Number },
    rating: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],

    // ===== Billing / Subscription =====
    tier: {
      type: String,
      enum: ["free", "amateur", "pro", "elite"],
      default: "free",
      index: true,
    },
    cadence: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    subscriptionStatus: {
      type: String,
      default: "inactive",
      index: true,
    },

    // Stripe linkage
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, index: true },

    // Period info
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAt: { type: Date }, 
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // ===== One-time perks =====
    // Clients: Day Pass (up to 30 artists in 24h)
    dayPassActiveUntil: { type: Date },
    // Artists: Spotlight Boost (featured bump 7 days)
    spotlightBoostUntil: { type: Date },

    // ===== Usage limits (server can enforce) =====
    // For clients: daily search quota depends on tier and day pass
    dailySearchLimit: { type: Number, default: 5 },
    lastSearchReset: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

userSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  if (this.clerkImageUrl) return this.clerkImageUrl;
  return "https://stock.adobe.com/search?k=default+profile+picture&asset_id=589932782";
};

export default mongoose.model("User", userSchema);