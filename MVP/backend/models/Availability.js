import mongoose from "mongoose";
const { Schema, model } = mongoose;

const TimeRangeSchema = new Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } }, 
  { _id: false }
);

const AvailabilitySchema = new Schema(
  {
    artistId: { type: Schema.Types.ObjectId, required: true, index: true },
    timezone: { type: String, default: "America/New_York" },
    slotMinutes: { type: Number, default: 60 },
    weekly: {
      sun: { type: [TimeRangeSchema], default: [] },
      mon: { type: [TimeRangeSchema], default: [] },
      tue: { type: [TimeRangeSchema], default: [] },
      wed: { type: [TimeRangeSchema], default: [] },
      thu: { type: [TimeRangeSchema], default: [] },
      fri: { type: [TimeRangeSchema], default: [] },
      sat: { type: [TimeRangeSchema], default: [] },
    },
    exceptions: { type: Map, of: [TimeRangeSchema], default: {} },
  },
  { timestamps: true }
);

export default model("Availability", AvailabilitySchema);