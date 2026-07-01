import mongoose from "mongoose";

const BillingSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Types.ObjectId, ref: "Booking", index: true },
  artistId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ["platform_fee", "deposit", "final_payment", "tip"],
    default: "platform_fee",
    index: true,
  },
  amountCents: { type: Number, default: 0, min: 0 },
  platformFeeCents: { type: Number, default: 0, min: 0 },
  stripeConnectAccountId: { type: String, index: true },
  currency: { type: String, default: "usd" },
  paidBy: { type: String, enum: ["client"], default: "client", index: true },
  status: {
    type: String,
    enum: ["pending", "paid", "refunded", "failed"],
    default: "pending",
    index: true,
  },
  stripeCustomerId: { type: String },
  stripeCheckoutSessionId: { type: String, index: true },
  stripePaymentIntentId: { type: String, index: true },
  stripeChargeId: { type: String, index: true },
  stripeTransferId: { type: String },
  stripeApplicationFeeId: { type: String },
  stripeRefundIds: { type: [String], default: [] },
  transferGroup: { type: String, index: true },
  studioId: { type: String },
  disputeStatus: {
    type: String,
    enum: [null, "disputed", "reversed", "reversal_failed"],
    default: null,
  },
  transfers: {
    type: [
      {
        _id: false,
        destination: String,
        amountCents: Number,
        kind: { type: String, enum: ["artist", "studio"] },
        stripeTransferId: String,
        status: { type: String, default: "paid" },
        error: String,
      },
    ],
    default: [],
  },
  payoutStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
    index: true,
  },
  payoutError: { type: String },
  payoutAttempts: { type: Number, default: 0 },
  lastPayoutAttemptAt: { type: Date },
  receiptUrl: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
  paidAt: { type: Date },
  refundedAt: { type: Date },
});

BillingSchema.index({ bookingId: 1, type: 1, status: 1 }, { name: "booking_type_status_idx" });
BillingSchema.index({ clientId: 1, stripeCustomerId: 1 }, { name: "client_customer_idx" });

export default mongoose.models.Billing ||
  mongoose.model("Billing", BillingSchema);