import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["client", "artist"],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["reference", "portfolio"],
      required: true,
      index: true,
    },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    width: Number,
    height: Number,
    bytes: Number,
    format: String,
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Image = mongoose.models.Image || mongoose.model("Image", ImageSchema);
export default Image;