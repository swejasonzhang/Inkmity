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
    // How big the artist judged the piece to be after the consultation. This caps how
    // many sessions/dates the client may book — a flash can't be spread across days.
    pieceSize: {
      type: String,
      enum: ["flash", "small", "medium", "large", "sleeve", "back_piece"],
      default: "flash",
    },
    maxSessions: {
      type: Number,
      default: 1,
      min: 1,
      max: 12,
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

ClientBookingPermissionSchema.index({ artistId: 1, clientId: 1 }, { unique: true });

export default mongoose.models.ClientBookingPermission ||
  mongoose.model("ClientBookingPermission", ClientBookingPermissionSchema);