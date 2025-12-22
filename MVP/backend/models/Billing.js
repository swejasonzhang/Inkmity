import mongoose from "mongoose";

const BillingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Types.ObjectId, ref: "Booking", index: true },
  artistId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ["platform_fee", "deposit", "final_payment"],
    default: "platform_fee",
    index: true,
  },
  amountCents: { type: Number, default: 1000, min: 0 },
  currency: { type: String, default: "usd" },
  paidBy: { type: String, enum: ["client"], default: "client", index: true },
  status: {
    type: String,
    enum: ["pending", "paid", "refunded"],
    default: "pending",
    index: true,
  },
  stripeCustomerId: { type: String },
  stripeCheckoutSessionId: { type: String, index: true },
  stripePaymentIntentId: { type: String, index: true },
  stripeChargeId: { type: String, index: true },
  stripeRefundIds: { type: [String], default: [] },
  receiptUrl: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
  paidAt: { type: Date },
  refundedAt: { type: Date },
});

export default mongoose.models.Billing ||
  mongoose.model("Billing", BillingSchema);