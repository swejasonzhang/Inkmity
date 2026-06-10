import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) not set");
  await mongoose.connect(uri);
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      await mongoose.connection.db.admin().ping();
      return { healthy: true, state: "connected" };
    }
    return { healthy: false, state: "disconnected" };
  } catch (error) {
    return { healthy: false, state: "error", error: error.message };
  }
};