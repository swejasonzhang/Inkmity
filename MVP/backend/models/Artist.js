import mongoose from "mongoose";

const artistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bio: { type: String },
  location: { type: String },
  style: { type: [String] },
  priceRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  rating: { type: Number, default: 0 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Artist", artistSchema);