import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, required: true },
    meta: {
      budgetCents: { type: Number },
      style: { type: String },
      targetDateISO: { type: String },
      referenceUrls: { type: [String], default: [] },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);