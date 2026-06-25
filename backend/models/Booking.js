import mongoose from "mongoose";
import { config } from "../config/index.js";

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
    autoCompleted: { type: Boolean, default: false },
    reminderSentAt: { type: Date },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["client", "artist", "system"] },
    cancellationReason: { type: String },
    rescheduledAt: { type: Date },
    rescheduledFrom: { type: Date },
    rescheduledBy: { type: String, enum: ["client", "artist"] },
    priceCents: { type: Number, default: 0, min: 0, max: config.booking.maxPriceCents },
    quotedPriceCents: { type: Number, default: 0, min: 0 },
    finalPriceSetAt: { type: Date },
    finalPriceApproved: { type: Boolean, default: true },
    finalPriceApprovedAt: { type: Date },
    depositRequiredCents: { type: Number, default: 0, min: 0 },
    depositPaidCents: { type: Number, default: 0, min: 0 },
    balancePaidCents: { type: Number, default: 0, min: 0 },
    tipCents: { type: Number, default: 0, min: 0 },
    balanceCapturedAt: { type: Date },
    balanceCaptureError: { type: String, default: "" },
    platformFeeCents: { type: Number, default: 0, min: 0 },
    stripeCustomerId: { type: String, default: "" },
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
    artistNoShowReportedAt: { type: Date },
    artistNoShowReason: { type: String, default: "" },
    artistNoShowStatus: {
      type: String,
      enum: ["reported", "disputed", "refunded", "dismissed"],
    },
    artistNoShowArtistNote: { type: String, default: "" },
    clientCheckedInAt: { type: Date },
    artistCheckedInAt: { type: Date },
    clientCheckInGeo: { lat: { type: Number }, lng: { type: Number } },
    artistCheckInGeo: { lat: { type: Number }, lng: { type: Number } },
    cancelToken: { type: String, select: false },
  },
  { timestamps: true }
);

BookingSchema.index({ artistId: 1, status: 1, startAt: -1 }, { name: "artist_status_date_idx" });
BookingSchema.index({ clientId: 1, status: 1, startAt: -1 }, { name: "client_status_date_idx" });
BookingSchema.index({ artistId: 1, startAt: 1, endAt: 1 }, { name: "artist_time_range_idx" });
BookingSchema.index({ clientId: 1, appointmentType: 1, status: 1 }, { name: "client_type_status_idx" });
BookingSchema.index({ status: 1, startAt: 1 }, { name: "status_date_idx" });
BookingSchema.index({ createdAt: -1 }, { name: "created_desc_idx" });

BookingSchema.index(
  { artistId: 1, startAt: 1 },
  {
    name: "artist_live_slot_unique",
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "accepted", "booked", "matched"] },
    },
  }
);

BookingSchema.index({ note: "text", requirements: "text", serviceDescription: "text" });

BookingSchema.pre("save", function (next) {
  if (this.isNew) this.quotedPriceCents = this.priceCents || 0;
  next();
});

BookingSchema.post("save", function (doc) {
  import("../services/socketService.js")
    .then(({ emitBookingUpdate }) => emitBookingUpdate(doc, doc.status))
    .catch(() => {});
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
