import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: { type: String },
    sender: { type: String, required: true }, 
    recipient: { type: String },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
