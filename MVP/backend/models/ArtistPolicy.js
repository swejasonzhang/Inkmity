const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const DepositPolicySchema = new Schema(
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

const ArtistPolicySchema = new Schema(
  {
    artistId: {
      type: Types.ObjectId,
      index: true,
      unique: true,
      required: true,
    },
    deposit: { type: DepositPolicySchema, default: () => ({}) },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ArtistPolicy ||
  mongoose.model("ArtistPolicy", ArtistPolicySchema);