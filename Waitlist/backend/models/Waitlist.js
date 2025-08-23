import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("Waitlist", waitlistSchema);
