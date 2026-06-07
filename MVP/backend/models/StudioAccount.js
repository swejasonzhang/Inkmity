import mongoose from "mongoose";
import User from "./UserBase.js";

const { Schema } = mongoose;

const StudioAccountSchema = new Schema(
  {
    ownedStudioId: { type: Schema.Types.ObjectId, ref: "Studio" },
  },
  { timestamps: true }
);

export default mongoose.models.studio ||
  User.discriminator("studio", StudioAccountSchema);
