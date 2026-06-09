import mongoose from "mongoose";

const { Schema } = mongoose;

const WaitlistSchema = new Schema(
  {
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "notified", "claimed", "cancelled", "expired"],
      default: "active",
      index: true,
    },
    fromDate: { type: Date },
    toDate: { type: Date },
    note: { type: String, default: "" },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

WaitlistSchema.index({ artistId: 1, status: 1 });

export default mongoose.models.Waitlist || mongoose.model("Waitlist", WaitlistSchema);
