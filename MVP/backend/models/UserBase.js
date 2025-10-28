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
    username: {
      type: String,
      required: true,
      default: function () {
        const f = this.nameParts?.first?.trim?.() || "";
        const l = this.nameParts?.last?.trim?.() || "";
        return `${f} ${l}`.trim() || "user";
      },
    },
    handle: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: "" },
    nameParts: {
      first: { type: String, default: "" },
      last: { type: String, default: "" },
    },
    avatar: ImageSchema,
    role: {
      type: String,
      required: true,
      enum: ["client", "artist"],
      index: true,
    },
    location: { type: String, default: "" },
  },
  { timestamps: true, discriminatorKey: "role", collection: "users" }
);

UserBaseSchema.pre("validate", function (next) {
  const f = this.nameParts?.first?.trim?.() || "";
  const l = this.nameParts?.last?.trim?.() || "";
  const combined = `${f} ${l}`.trim();
  if (
    !this.username ||
    this.username === "user" ||
    this.isModified("nameParts")
  ) {
    this.username = combined || this.username || "user";
  }
  this.displayName = combined || this.displayName || "";
  next();
});

UserBaseSchema.methods.getAvatarUrl = function () {
  if (this.avatar?.url) return this.avatar.url;
  return "https://images.placeholders.dev/?width=256&height=256&text=Profile";
};

export default mongoose.models.User || mongoose.model("User", UserBaseSchema);