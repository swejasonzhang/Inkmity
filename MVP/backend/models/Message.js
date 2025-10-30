import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["message", "request"],
      default: "message",
      index: true,
    },
    requestStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: undefined,
      index: true,
    },
    seen: { type: Boolean, default: false, index: true },
    delivered: { type: Boolean, default: false, index: true },
    deliveredAt: { type: Date },
    meta: {
      budgetCents: { type: Number },
      style: { type: String },
      targetDateISO: { type: String },
      referenceUrls: { type: [String], default: [] },
      placement: { type: String },
      workRefs: { type: [String], default: [] },
      kind: { type: String },
      status: { type: String },
    },
    threadKey: { type: String, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MessageSchema.pre("save", function (next) {
  if (!this.threadKey && this.senderId && this.receiverId) {
    this.threadKey = [this.senderId, this.receiverId].sort().join(":");
  }
  next();
});

MessageSchema.index(
  { receiverId: 1, type: 1, seen: 1, createdAt: -1 },
  { name: "unread_idx" }
);
MessageSchema.index(
  { senderId: 1, receiverId: 1, type: 1, requestStatus: 1, createdAt: -1 },
  { name: "req_lookup" }
);

MessageSchema.statics.ackForPair = function (viewerId, participantId) {
  const threadKey = [viewerId, participantId].sort().join(":");
  const now = new Date();
  return Promise.all([
    this.updateMany(
      { threadKey, receiverId: viewerId, delivered: { $ne: true } },
      { $set: { delivered: true, deliveredAt: now } }
    ),
    this.updateMany(
      { threadKey, receiverId: viewerId, seen: false },
      { $set: { seen: true } }
    ),
  ]);
};

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);