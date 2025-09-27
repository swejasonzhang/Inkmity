import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["client", "artist"],
      default: "client",
      required: true,
    },

    location: { type: String },
    style: [{ type: String }],
    bio: { type: String },
    priceRange: {
      min: Number,
      max: Number,
    },
    rating: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
