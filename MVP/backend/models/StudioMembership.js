import mongoose from "mongoose";

const { Schema } = mongoose;

const StudioMembershipSchema = new Schema(
  {
    studioId: {
      type: Schema.Types.ObjectId,
      ref: "Studio",
      required: true,
      index: true,
    },
    artistClerkId: { type: String, required: true, index: true },

    role: {
      type: String,
      enum: ["owner", "manager", "artist"],
      default: "artist",
    },
    status: {
      type: String,
      enum: ["invited", "active", "declined", "removed"],
      default: "invited",
      index: true,
    },

    commissionPct: { type: Number, min: 0, max: 1, default: null },

    invitedBy: { type: String },
    invitedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

StudioMembershipSchema.index(
  { studioId: 1, artistClerkId: 1 },
  { unique: true }
);

export default mongoose.models.StudioMembership ||
  mongoose.model("StudioMembership", StudioMembershipSchema);
