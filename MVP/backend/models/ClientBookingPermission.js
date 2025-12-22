import mongoose from "mongoose";

const ClientBookingPermissionSchema = new mongoose.Schema(
  {
    artistId: {
      type: String,
      required: true,
      index: true,
    },
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    enabledAt: {
      type: Date,
      default: Date.now,
    },
    enabledBy: {
      type: String,
      enum: ["artist", "system"],
      default: "artist",
    },
  },
  { timestamps: true }
);

// Compound index to ensure one permission per artist-client pair
ClientBookingPermissionSchema.index({ artistId: 1, clientId: 1 }, { unique: true });

export default mongoose.models.ClientBookingPermission ||
  mongoose.model("ClientBookingPermission", ClientBookingPermissionSchema);

