import User from "./UserBase.js";
import mongoose from "mongoose";
const { Schema } = mongoose;

const ClientSchema = new Schema(
  {
    budget: {
      min: { type: Number, default: 100 },
      max: { type: Number, default: 200 },
    },
    location: { type: String },
    placement: { type: String },
    size: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Client ||
  User.discriminator("client", ClientSchema);