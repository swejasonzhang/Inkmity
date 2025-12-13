import mongoose from "mongoose";
import User from "./UserBase.js";
const { Schema } = mongoose;

const ClientSchema = new Schema(
  {
    budgetMin: { type: Number, default: 100 },
    budgetMax: { type: Number, default: 200 },
    location: String,
    placement: String,
    size: String,
    references: { type: [String], default: [] },
    totalFeesPaid: { type: Number, default: 0 },
    rewardsPoints: { type: Number, default: 0, index: true },
    lifetimeDiscountUsd: { type: Number, default: 0 },
    lastRewardAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.client ||
  User.discriminator("client", ClientSchema);