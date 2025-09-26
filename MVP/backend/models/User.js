import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String },
  username: { type: String, required: true, unique: true },
  email: { type: String },
  role: { type: String, enum: ["client", "artist"], default: "client" },
  location: { type: String },
  style: [{ type: String }],
  bio: { type: String },
  priceRange: {
    min: { type: Number },
    max: { type: Number },
  },
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);