import mongoose from "mongoose";

const BookingCooldownSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    artistId: { type: String, required: true, index: true },
    cancelledAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    bookingId: { type: mongoose.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true }
);

BookingCooldownSchema.index({ userId: 1, artistId: 1, expiresAt: 1 });

export default mongoose.models.BookingCooldown ||
  mongoose.model("BookingCooldown", BookingCooldownSchema);