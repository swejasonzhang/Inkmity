import mongoose from "mongoose";

const { Schema } = mongoose;

const LogoSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
  },
  { _id: false }
);

const StudioSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerClerkId: { type: String, required: true, index: true },
    slug: { type: String, unique: true, sparse: true, index: true },

    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    lat: { type: Number },
    lng: { type: Number },
    // Google Places place_id — proof the location is a real, listed business.
    placeId: { type: String, default: "", index: true },
    logo: LogoSchema,
    bio: { type: String, default: "", maxlength: 600 },

    defaultCommissionPct: { type: Number, default: 0.3, min: 0, max: 1 },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verifiedAt: { type: Date },
    verificationNotes: { type: String, default: "" },

    stripeConnectAccountId: { type: String, index: true },
    chargesEnabled: { type: Boolean, default: false, index: true },
    payoutsEnabled: { type: Boolean, default: false },
    onboardingCompletedAt: { type: Date },
    connectRequirementsDue: { type: [String], default: [] },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Studio || mongoose.model("Studio", StudioSchema);
