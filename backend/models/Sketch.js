import mongoose from "mongoose";

const { Schema } = mongoose;

const SketchSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    imageUrls: { type: [String], default: [] },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "changes_requested"],
      default: "pending",
      index: true,
    },
    clientNote: { type: String, default: "" },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Sketch || mongoose.model("Sketch", SketchSchema);
