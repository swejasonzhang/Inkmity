import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    placement: { type: String, default: "" },
    estimatedSessions: { type: Number, default: 1, min: 1 },
    completedSessions: { type: Number, default: 0, min: 0 },
    totalPriceCents: { type: Number, default: 0, min: 0 },
    depositPaidCents: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "on_hold"],
      default: "active",
      index: true,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    referenceImageIds: [{ type: mongoose.Types.ObjectId, ref: "Image" }],
    artistNotes: { type: String, default: "" },
    clientNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Project ||
  mongoose.model("Project", ProjectSchema);