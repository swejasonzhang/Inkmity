import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    reporterClerkId: { type: String, required: true, index: true },
    targetType: {
      type: String,
      enum: ["artwork", "message", "artist", "profile"],
      required: true,
      index: true,
    },
    targetRef: { type: String, required: true },
    targetOwnerClerkId: { type: String, default: "", index: true },
    reason: {
      type: String,
      enum: ["spam", "inappropriate", "harassment", "copyright", "impersonation", "other"],
      required: true,
    },
    details: { type: String, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["open", "reviewed", "actioned", "dismissed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model("Report", ReportSchema);
