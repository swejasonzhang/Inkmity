import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Types.ObjectId, required: true, index: true },
    clientId: { type: mongoose.Types.ObjectId, required: true, index: true },
    serviceId: { type: mongoose.Types.ObjectId },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    note: { type: String },
    status: {
      type: String,
      enum: ["booked", "matched", "completed", "cancelled"],
      default: "booked",
      index: true,
    },
    priceCents: { type: Number, default: 0, min: 0 },
    depositRequiredCents: { type: Number, default: 0, min: 0 },
    depositPaidCents: { type: Number, default: 0, min: 0 },
    clientCode: { type: String },
    artistCode: { type: String },
    codeIssuedAt: { type: Date },
    codeExpiresAt: { type: Date },
    clientVerifiedAt: { type: Date },
    artistVerifiedAt: { type: Date },
    matchedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);