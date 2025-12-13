[{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/ChatWindow.tsx",
	"owner": "typescript",
	"code": "1261",
	"severity": 8,
	"message": "Already included file name '/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/messages/RequestPanel.tsx' differs from file name '/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/messages/requestPanel.tsx' only in casing.\n  The file is in the program because:\n    Imported via \"./messages/RequestPanel\" from file '/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/ChatWindow.tsx'\n    Matched by include pattern 'src' in '/Users/jason/Desktop/Inkmity/MVP/frontend/tsconfig.json'",
	"source": "ts",
	"startLineNumber": 10,
	"startColumn": 26,
	"endLineNumber": 10,
	"endColumn": 51,
	"relatedInformation": [
		{
			"startLineNumber": 23,
			"startColumn": 15,
			"endLineNumber": 23,
			"endColumn": 20,
			"message": "File is matched by include pattern specified here.",
			"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/tsconfig.json"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/ChatWindow.tsx",
	"owner": "typescript",
	"code": "6133",
	"severity": 4,
	"message": "'mobileView' is declared but its value is never read.",
	"source": "ts",
	"startLineNumber": 106,
	"startColumn": 10,
	"endLineNumber": 106,
	"endColumn": 20,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/components/dashboard/shared/ChatWindow.tsx",
	"owner": "typescript",
	"code": "6133",
	"severity": 4,
	"message": "'setMobileView' is declared but its value is never read.",
	"source": "ts",
	"startLineNumber": 106,
	"startColumn": 22,
	"endLineNumber": 106,
	"endColumn": 35,
	"tags": [
		1
	],
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/hooks/useMessaging.ts",
	"owner": "typescript",
	"code": "2551",
	"severity": 8,
	"message": "Property 'seenAt' does not exist on type '{ senderId: string; receiverId: string; text: string; timestamp: number; meta?: any; delivered?: boolean | undefined; seen?: boolean | undefined; }'. Did you mean 'seen'?",
	"source": "ts",
	"startLineNumber": 552,
	"startColumn": 34,
	"endLineNumber": 552,
	"endColumn": 40,
	"relatedInformation": [
		{
			"startLineNumber": 11,
			"startColumn": 3,
			"endLineNumber": 11,
			"endColumn": 7,
			"message": "'seen' is declared here.",
			"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/hooks/useMessaging.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/hooks/useMessaging.ts",
	"owner": "typescript",
	"code": "2551",
	"severity": 8,
	"message": "Property 'deliveredAt' does not exist on type '{ senderId: string; receiverId: string; text: string; timestamp: number; meta?: any; delivered?: boolean | undefined; seen?: boolean | undefined; }'. Did you mean 'delivered'?",
	"source": "ts",
	"startLineNumber": 556,
	"startColumn": 39,
	"endLineNumber": 556,
	"endColumn": 50,
	"relatedInformation": [
		{
			"startLineNumber": 10,
			"startColumn": 3,
			"endLineNumber": 10,
			"endColumn": 12,
			"message": "'delivered' is declared here.",
			"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/hooks/useMessaging.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/pages/Dashboard.tsx",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '() => Promise<unknown>' is not assignable to parameter of type '() => Promise<{ default: ComponentType<any>; }>'.\n  Type 'Promise<unknown>' is not assignable to type 'Promise<{ default: ComponentType<any>; }>'.\n    Type 'unknown' is not assignable to type '{ default: ComponentType<any>; }'.",
	"source": "ts",
	"startLineNumber": 34,
	"startColumn": 30,
	"endLineNumber": 34,
	"endColumn": 49,
	"origin": "extHost1"
},{
	"resource": "/Users/jason/Desktop/Inkmity/MVP/frontend/src/pages/Dashboard.tsx",
	"owner": "typescript",
	"code": "2345",
	"severity": 8,
	"message": "Argument of type '() => Promise<unknown>' is not assignable to parameter of type '() => Promise<{ default: ComponentType<any>; }>'.\n  Type 'Promise<unknown>' is not assignable to type 'Promise<{ default: ComponentType<any>; }>'.\n    Type 'unknown' is not assignable to type '{ default: ComponentType<any>; }'.",
	"source": "ts",
	"startLineNumber": 35,
	"startColumn": 30,
	"endLineNumber": 35,
	"endColumn": 49,
	"origin": "extHost1"
}]import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    serviceId: { type: mongoose.Types.ObjectId },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    note: { type: String },
    serviceName: { type: String },
    serviceDescription: { type: String },
    requirements: { type: String },
    estimatedDuration: { type: Number },
    location: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in-progress", "completed", "cancelled", "no-show"],
      default: "pending",
      index: true,
    },
    confirmedAt: { type: Date },
    reminderSentAt: { type: Date },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent1h: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ["client", "artist", "system"] },
    cancellationReason: { type: String },
    rescheduledAt: { type: Date },
    rescheduledFrom: { type: Date },
    rescheduledBy: { type: String, enum: ["client", "artist"] },
    priceCents: { type: Number, default: 0, min: 0 },
    depositRequiredCents: { type: Number, default: 0, min: 0 },
    depositPaidCents: { type: Number, default: 0, min: 0 },
    clientCode: { type: String },
    artistCode: { type: String },
    codeIssuedAt: { type: Date },
    codeExpiresAt: { type: Date },
    clientVerifiedAt: { type: Date },
    artistVerifiedAt: { type: Date },
    matchedAt: { type: Date },
    completedAt: { type: Date },
    appointmentType: {
      type: String,
      enum: ["consultation", "tattoo_session"],
      default: "tattoo_session",
      index: true,
    },
    projectId: { type: mongoose.Types.ObjectId, ref: "Project", index: true },
    sessionNumber: { type: Number, default: 1, min: 1 },
    intakeFormId: { type: mongoose.Types.ObjectId, ref: "IntakeForm" },
    referenceImageIds: [{ type: mongoose.Types.ObjectId, ref: "Image" }],
    rescheduleNoticeHours: { type: Number },
    noShowMarkedAt: { type: Date },
    noShowMarkedBy: { type: String, enum: ["client", "artist", "system"] },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);