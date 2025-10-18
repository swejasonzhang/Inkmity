import mongoose from "mongoose";
const { Schema } = mongoose;

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: "Profile photo" },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const UserBaseSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ["client", "artist"],
      required: true,
      index: true,
    },
    avatar: { type: ImageSchema },
    clerkImageUrl: { type: String },
    references: { type: [String], default: [] },
  },
  { timestamps: true, discriminatorKey: "role" }
);

UserBaseSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  if (this.clerkImageUrl) return this.clerkImageUrl;
  return "https://stock.adobe.com/search?k=default+profile+picture&asset_id=589932782";
};

export default mongoose.models.User || mongoose.model("User", UserBaseSchema);