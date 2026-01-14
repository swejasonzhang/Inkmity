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
    styles: [{ type: String, index: true }],
    avatar: ImageSchema,
    role: {
      type: String,
      required: true,
      enum: ["client", "artist"],
      index: true,
    },
    location: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 600, required: false },
    visible: { type: Boolean, default: true, index: true },
    visibility: { type: String, enum: ["online", "away", "invisible"], default: "online", index: true },
  },
  { timestamps: true, discriminatorKey: "role", collection: "users" }
);

UserBaseSchema.index({ role: 1, visible: 1, rating: -1 }, { name: "role_visible_rating_idx" });
UserBaseSchema.index({ role: 1, location: 1, rating: -1 }, { name: "role_location_rating_idx" });
UserBaseSchema.index({ role: 1, styles: 1, rating: -1 }, { name: "role_styles_rating_idx" });
UserBaseSchema.index({ role: 1, createdAt: -1 }, { name: "role_created_idx" });

UserBaseSchema.index({ username: "text", handle: "text", bio: "text", location: "text" });

UserBaseSchema.pre("validate", function (next) {
  if (!this.username || !this.username.trim()) this.username = "user";
  next();
});

UserBaseSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  return "https://images.placeholders.dev/?width=256&height=256&text=Profile";
};

export default mongoose.models.User || mongoose.model("User", UserBaseSchema);
