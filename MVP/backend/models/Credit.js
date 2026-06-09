import mongoose from "mongoose";

const { Schema } = mongoose;

const CreditSchema = new Schema(
  {
    clientId: { type: String, required: true, index: true },
    amountCents: { type: Number, required: true, min: 0 },
    remainingCents: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["loyalty_annual", "consultation", "birthday", "manual", "promo"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["active", "spent", "expired", "revoked"],
      default: "active",
      index: true,
    },
    grantedBy: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Credit || mongoose.model("Credit", CreditSchema);
