import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  bio: { type: String },
  avatarUrl: { type: String },
  favoriteTattooStyles: [String],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Profile", profileSchema);