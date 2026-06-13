import mongoose from "mongoose";

const { Schema } = mongoose;

const ArtworkLikeSchema = new Schema(
  {
    userClerkId: { type: String, required: true, index: true },
    artistClerkId: { type: String, required: true, index: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

ArtworkLikeSchema.index({ userClerkId: 1, artistClerkId: 1, imageUrl: 1 }, { unique: true });
ArtworkLikeSchema.index({ artistClerkId: 1, imageUrl: 1 });

export default mongoose.models.ArtworkLike || mongoose.model("ArtworkLike", ArtworkLikeSchema);
