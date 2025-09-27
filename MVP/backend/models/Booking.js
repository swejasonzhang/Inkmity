import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BookingSchema = new Schema(
  {
    artistId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    note: { type: String },
    status: { type: String, enum: ["booked", "cancelled"], default: "booked" },
  },
  { timestamps: true }
);

BookingSchema.index({ artistId: 1, start: 1 });

export default model("Booking", BookingSchema);
