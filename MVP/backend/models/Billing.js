import mongoose from "mongoose";

const BillingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Types.ObjectId, ref: "Booking", index: true },
  artistId: { type: mongoose.Types.ObjectId, index: true },
  clientId: { type: mongoose.Types.ObjectId, index: true },
  type: { type: String, default: "booking_fee" },
  amountCents: { type: Number, default: 1000 },
  currency: { type: String, default: "usd" },
  status: { type: String, default: "pending", index: true },
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