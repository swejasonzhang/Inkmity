import mongoose from "mongoose";

const ArtistPolicySchema = new mongoose.Schema(
  {
    artistId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    deposit: {
      mode: { type: String, enum: ["percent", "flat"], default: "percent" },
      percent: { type: Number, default: 0.2, min: 0, max: 1 },
      amountCents: { type: Number, default: 0, min: 0 },
      minCents: { type: Number, default: 5000, min: 0 },
      maxCents: { type: Number, default: 30000, min: 0 },
      nonRefundable: { type: Boolean, default: true },
      cutoffHours: { type: Number, default: 48, min: 0 },
      consultationFree: { type: Boolean, default: true },
    },
    bookingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.ArtistPolicy ||
  mongoose.model("ArtistPolicy", ArtistPolicySchema);