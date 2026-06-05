import "../loadEnv.js";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db.js";
import UserBase from "../models/UserBase.js";
import Artist from "../models/Artist.js";
import Client from "../models/Client.js";
import Booking from "../models/Booking.js";
import BookingCooldown from "../models/BookingCooldown.js";
import Message from "../models/Message.js";
import DeletedConversation from "../models/DeletedConversation.js";
import Review from "../models/Review.js";
import Availability from "../models/Availability.js";
import ArtistPolicy from "../models/ArtistPolicy.js";
import ClientBookingPermission from "../models/ClientBookingPermission.js";
import Billing from "../models/Billing.js";
import IntakeForm from "../models/IntakeForm.js";
import Project from "../models/Project.js";
import Image from "../models/Image.js";

const MODELS = [
  ["UserBase", UserBase],
  ["Artist", Artist],
  ["Client", Client],
  ["Booking", Booking],
  ["BookingCooldown", BookingCooldown],
  ["Message", Message],
  ["DeletedConversation", DeletedConversation],
  ["Review", Review],
  ["Availability", Availability],
  ["ArtistPolicy", ArtistPolicy],
  ["ClientBookingPermission", ClientBookingPermission],
  ["Billing", Billing],
  ["IntakeForm", IntakeForm],
  ["Project", Project],
  ["Image", Image],
];

async function run() {
  if ((process.env.NODE_ENV || "development") === "production") {
    console.error("Refusing to run resetAccounts in production.");
    process.exit(1);
  }

  await connectDB();
  const { host, name } = mongoose.connection;
  console.log(`\n=== RESET dev database — full clean slate ===`);
  console.log(`Target: ${host} / db "${name}"\n`);

  for (const [label, Model] of MODELS) {
    try {
      const before = await Model.countDocuments();
      const res = await Model.deleteMany({});
      console.log(`  ${label.padEnd(24)} deleted ${res.deletedCount} (was ${before})`);
    } catch (e) {
      console.log(`  ${label.padEnd(24)} skipped (${e.message})`);
    }
  }

  console.log(`\n=== Done. Database is clean. ===`);
  console.log(`Next: sign up two accounts through the app — one Client and one Artist — then interact.\n`);
  await disconnectDB();
}

run().catch(async (err) => {
  console.error("Reset failed:", err);
  await disconnectDB();
  process.exit(1);
});
