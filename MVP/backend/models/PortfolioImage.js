import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const PortfolioImageSchema = new Schema(
  {
    artistId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    url: { type: String, required: true },
    publicId: { type: String, required: true, index: true },
    width: { type: Number },
    height: { type: Number },
    format: { type: String },
    bytes: { type: Number },

    caption: { type: String },
    tags: { type: [String], default: [], index: true },
    isCover: { type: Boolean, default: false, index: true },

    albumId: { type: String, index: true },
    albumName: { type: String },

    deletedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

PortfolioImageSchema.index({ artistId: 1, createdAt: -1, _id: -1 });

export default mongoose.models.PortfolioImage ||
  mongoose.model("PortfolioImage", PortfolioImageSchema);