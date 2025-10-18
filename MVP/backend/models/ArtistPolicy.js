import mongoose from "mongoose";

const DepositPolicySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["flat", "percent"], default: "percent" },
    amountCents: { type: Number, default: 5000 },
    percent: { type: Number, default: 0.2 },
    minCents: { type: Number, default: 5000 },
    maxCents: { type: Number, default: 30000 },
    nonRefundable: { type: Boolean, default: true },
    cutoffHours: { type: Number, default: 48 },
  },
  { _id: false }
);

const ArtistPolicySchema = new mongoose.Schema(
  {
    artistId: {
      type: mongoose.Types.ObjectId,
      index: true,
      unique: true,
      required: true,
    },
    deposit: { type: DepositPolicySchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.models.ArtistPolicy ||
  mongoose.model("ArtistPolicy", ArtistPolicySchema);