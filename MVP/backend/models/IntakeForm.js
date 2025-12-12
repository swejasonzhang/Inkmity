import mongoose from "mongoose";

const IntakeFormSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    clientId: { type: String, required: true, index: true },
    artistId: { type: String, required: true, index: true },
    healthInfo: {
      allergies: { type: String, default: "" },
      medications: { type: String, default: "" },
      medicalConditions: { type: String, default: "" },
      skinConditions: { type: String, default: "" },
      bloodThinners: { type: Boolean, default: false },
      pregnant: { type: Boolean, default: false },
      recentSurgery: { type: Boolean, default: false },
      recentSurgeryDetails: { type: String, default: "" },
    },
    tattooDetails: {
      placement: { type: String, default: "" },
      size: { type: String, default: "" },
      style: { type: String, default: "" },
      description: { type: String, default: "" },
      isCoverUp: { type: Boolean, default: false },
      isTouchUp: { type: Boolean, default: false },
    },
    consent: {
      ageVerification: { type: Boolean, default: false, required: true },
      healthDisclosure: { type: Boolean, default: false, required: true },
      aftercareInstructions: { type: Boolean, default: false, required: true },
      photoRelease: { type: Boolean, default: false },
      depositPolicy: { type: Boolean, default: false, required: true },
      cancellationPolicy: { type: Boolean, default: false, required: true },
    },
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relationship: { type: String, default: "" },
    },
    additionalNotes: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.IntakeForm ||
  mongoose.model("IntakeForm", IntakeFormSchema);


