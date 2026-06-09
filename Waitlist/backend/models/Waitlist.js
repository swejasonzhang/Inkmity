import mongoose from "mongoose";

const WaitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// (email already has field-level `unique: true, index: true` — no separate index needed)

const Waitlist = mongoose.models.Waitlist ||
  mongoose.model("Waitlist", WaitlistSchema);

export async function ensureIndexes() {
  try {
    await Waitlist.createIndexes();
  } catch (err) {
    if (err.code !== 85 && !err.message?.includes("already exists")) {
      console.error("Error creating Waitlist indexes:", err);
    }
  }
}

export default Waitlist;