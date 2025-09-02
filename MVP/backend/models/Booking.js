import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userId: { type: String, required: true }, 
  tattooName: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, default: "pending" }, 
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Booking", bookingSchema);