import User from "./UserBase.js";
import mongoose from "mongoose";
const { Schema } = mongoose;

const ClientSchema = new Schema(
  {
    budgetMin: { type: Number, default: 100 },
    budgetMax: { type: Number, default: 200 },
    location: { type: String },
    placement: { type: String },
    size: { type: String },
    notes: { type: String },
    totalFeesPaid: { type: Number, default: 0 },
    rewardsPoints: { type: Number, default: 0, index: true },
    lifetimeDiscountUsd: { type: Number, default: 0 },
    lastRewardAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Client ||
  User.discriminator("client", ClientSchema);
