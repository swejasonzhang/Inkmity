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

WaitlistSchema.index({ email: 1 }, { unique: true });

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