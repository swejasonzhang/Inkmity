import mongoose from "mongoose";

const { Schema } = mongoose;

const SignedDocumentSchema = new Schema(
  {
    docType: {
      type: String,
      required: true,
      enum: ["platform_terms", "client_waiver", "studio_agreement", "artist_agreement"],
      index: true,
    },
    version: { type: String, required: true },

    signerClerkId: { type: String, required: true, index: true },
    signerRole: { type: String, enum: ["client", "artist", "studio"], required: true },

    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    studioId: { type: Schema.Types.ObjectId, ref: "Studio", index: true },

    signatureName: { type: String, required: true },
    contentHash: { type: String, required: true },

    ip: { type: String },
    userAgent: { type: String },

    provider: { type: String, enum: ["in_house", "dropbox_sign"], default: "in_house" },
    providerRef: { type: String },

    signedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SignedDocumentSchema.index({ signerClerkId: 1, docType: 1, version: 1, bookingId: 1 });

export default mongoose.models.SignedDocument ||
  mongoose.model("SignedDocument", SignedDocumentSchema);
