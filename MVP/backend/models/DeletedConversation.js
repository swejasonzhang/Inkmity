import mongoose from "mongoose";

const DeletedConversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    participantId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

DeletedConversationSchema.index({ userId: 1, participantId: 1 }, { unique: true });

export default mongoose.models.DeletedConversation ||
  mongoose.model("DeletedConversation", DeletedConversationSchema);
