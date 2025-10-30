import mongoose from "mongoose";

const ArtistPolicySchema = new mongoose.Schema(
  {
    artistId: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
    },
    deposit: {
      mode: { type: String, enum: ["percent", "flat"], default: "percent" },
      percent: { type: Number, default: 0.2, min: 0, max: 1 },
      amountCents: { type: Number, default: 0, min: 0 },
      minCents: { type: Number, default: 0, min: 0 },
      maxCents: { type: Number, default: 1000000, min: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.ArtistPolicy ||
  mongoose.model("ArtistPolicy", ArtistPolicySchema);
