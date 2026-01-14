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
      enum: ["pending", "confirmed", "in-progress", "completed", "cancelled", "no-show", "booked", "matched", "accepted", "denied"],
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
    appointmentType: {
      type: String,
      enum: ["consultation", "tattoo_session"],
      default: "tattoo_session",
      index: true,
    },
    projectId: { type: mongoose.Types.ObjectId, ref: "Project", index: true },
    sessionNumber: { type: Number, default: 1, min: 1 },
    intakeFormId: { type: mongoose.Types.ObjectId, ref: "IntakeForm" },
    referenceImageIds: [{ type: mongoose.Types.ObjectId, ref: "Image" }],
    rescheduleNoticeHours: { type: Number },
    noShowMarkedAt: { type: Date },
    noShowMarkedBy: { type: String, enum: ["client", "artist", "system"] },
  },
  { timestamps: true }
);

// Performance-optimized compound indexes for common queries
BookingSchema.index({ artistId: 1, status: 1, startAt: -1 }, { name: "artist_status_date_idx" });
BookingSchema.index({ clientId: 1, status: 1, startAt: -1 }, { name: "client_status_date_idx" });
BookingSchema.index({ artistId: 1, startAt: 1, endAt: 1 }, { name: "artist_time_range_idx" });
BookingSchema.index({ clientId: 1, appointmentType: 1, status: 1 }, { name: "client_type_status_idx" });
BookingSchema.index({ status: 1, startAt: 1 }, { name: "status_date_idx" });
BookingSchema.index({ createdAt: -1 }, { name: "created_desc_idx" });

// Text search index for note/requirements searching
BookingSchema.index({ note: "text", requirements: "text", serviceDescription: "text" });

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
