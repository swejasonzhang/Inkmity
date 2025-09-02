import mongoose from "mongoose";

const tattooSchema = new mongoose.Schema({
  userId: { type: String },
  name: { type: String, required: true },
  description: { type: String },
  imageUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Tattoo", tattooSchema);