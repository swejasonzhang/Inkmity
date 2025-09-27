import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true }, 
    receiverId: { type: String, required: true }, 
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Message", MessageSchema);