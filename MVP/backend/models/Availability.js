import mongoose from "mongoose";

const TimeRange = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Types.ObjectId, required: true, index: true },
    timezone: { type: String, default: "America/New_York" },
    slotMinutes: { type: Number, default: 60, min: 5, max: 480 },
    weekly: {
      type: Map,
      of: [TimeRange],
      default: {
        sun: [],
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
      },
    },
    exceptions: { type: Map, of: [TimeRange], default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Availability ||
  mongoose.model("Availability", AvailabilitySchema);