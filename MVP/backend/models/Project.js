import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    // Project details
    placement: { type: String, default: "" },
    estimatedSessions: { type: Number, default: 1, min: 1 },
    completedSessions: { type: Number, default: 0, min: 0 },
    // Pricing
    totalPriceCents: { type: Number, default: 0, min: 0 },
    depositPaidCents: { type: Number, default: 0, min: 0 },
    // Status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "on_hold"],
      default: "active",
      index: true,
    },
    // Timeline
    startedAt: { type: Date },
    completedAt: { type: Date },
    // Reference images
    referenceImageIds: [{ type: mongoose.Types.ObjectId, ref: "Image" }],
    // Notes
    artistNotes: { type: String, default: "" },
    clientNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);

