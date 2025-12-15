import mongoose from "mongoose";

const WebhookEventSchema = new mongoose.Schema(
  {
    stripeEventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.WebhookEvent ||
  mongoose.model("WebhookEvent", WebhookEventSchema);