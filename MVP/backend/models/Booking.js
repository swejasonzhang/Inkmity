const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const BookingSchema = new Schema({
  artistId: { type: Types.ObjectId, index: true, required: true },
  clientId: { type: Types.ObjectId, index: true },
  serviceId: { type: Types.ObjectId, index: true },
  startAt: { type: Date, index: true, required: true },
  endAt: { type: Date, required: true },
  status: { type: String, index: true, default: "booked" }, 
  priceCents: { type: Number, default: 0 },
  tipCents: { type: Number, default: 0 },

  depositRequiredCents: { type: Number, default: 0 },
  depositPaidCents: { type: Number, default: 0 },
  depositPct: { type: Number, default: 0 },
  depositPaidAt: { type: Date },

  clientCode: { type: String }, 
  artistCode: { type: String },
  clientVerifiedAt: { type: Date },
  artistVerifiedAt: { type: Date },
  matchedAt: { type: Date },

  note: { type: String },
  style: { type: String },
  leadSource: { type: String },
  suppliesCostCents: { type: Number, default: 0 },
  touchUp: { type: Boolean, default: false },
  aftercareIssue: { type: Boolean, default: false },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

BookingSchema.index({ artistId: 1, startAt: 1 });

module.exports =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
