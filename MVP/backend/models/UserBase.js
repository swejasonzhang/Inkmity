import mongoose from "mongoose";
const { Schema } = mongoose;

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    alt: String,
    width: Number,
    height: Number,
  },
  { _id: false }
);

const UserBaseSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, default: "user" },
    handle: { type: String, required: true, unique: true, index: true },
    avatar: ImageSchema,
    role: {
      type: String,
      required: true,
      enum: ["client", "artist"],
      index: true,
    },
    location: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 600, required: false },
  },
  { timestamps: true, discriminatorKey: "role", collection: "users" }
);

UserBaseSchema.pre("validate", function (next) {
  if (!this.username || !this.username.trim()) this.username = "user";
  next();
});

UserBaseSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  return "https://images.placeholders.dev/?width=256&height=256&text=Profile";
};

export default mongoose.models.User || mongoose.model("User", UserBaseSchema);
