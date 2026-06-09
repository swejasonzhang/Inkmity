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
    dob: { type: Date },
    lastBirthdayCreditYear: { type: Number },
    totalFeesPaid: { type: Number, default: 0 },
    rewardsPoints: { type: Number, default: 0, index: true },
    lifetimeDiscountUsd: { type: Number, default: 0 },
    lastRewardAt: Date,
    completedBookingsCount: { type: Number, default: 0, index: true },
    rewardsTier: { type: String, default: "bronze", index: true },
  },
  { timestamps: true }
);

export default mongoose.models.client ||
  User.discriminator("client", ClientSchema);