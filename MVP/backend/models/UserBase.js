import mongoose from "mongoose";
const { Schema } = mongoose;

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    alt: { type: String, default: "Profile photo" },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const UserBaseSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    avatar: ImageSchema,
    clerkImageUrl: String,
    references: { type: [String], default: [] },
  },
  { timestamps: true, discriminatorKey: "role", collection: "users" }
);

UserBaseSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  if (this.clerkImageUrl) return this.clerkImageUrl;
  return "https://images.placeholders.dev/?width=256&height=256&text=Profile";
};

export default mongoose.models.User || mongoose.model("User", UserBaseSchema);