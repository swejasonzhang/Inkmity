import mongoose from "mongoose";

const RevokedTokenSchema = new mongoose.Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: Date.now,
      expires: 86400 * 7,
    },
  },
  {
    timestamps: true,
  }
);

RevokedTokenSchema.index({ revokedAt: 1 }, { expireAfterSeconds: 86400 * 7 });

export default mongoose.models.RevokedToken ||
  mongoose.model("RevokedToken", RevokedTokenSchema);

