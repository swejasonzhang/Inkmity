import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    serviceId: { type: mongoose.Types.ObjectId },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    note: { type: String },
    serviceName: { type: String },
    serviceDescription: { type: String },
    requirements: { type: String },
    estimatedDuration: { type: Number },
    location: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in-progress", "completed", "cancelled", "no-show"],
      default: "pending",
      index: true,
    },
    confirmedAt: { type: Date },
    reminderSentAt: { type: Date },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["client", "artist", "system"] },
    cancellationReason: { type: String },
    rescheduledAt: { type: Date },
    rescheduledFrom: { type: Date },
    rescheduledBy: { type: String, enum: ["client", "artist"] },
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