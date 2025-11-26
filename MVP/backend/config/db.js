import mongoose from "mongoose";
import logger from "../utils/logger.js";

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) not set");

  const options = {
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || "10"),
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || "2"),
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, options);
      
      mongoose.connection.on("error", (err) => {
        logger.error("Database connection error", { error: err.message, stack: err.stack });
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("Disconnected from MongoDB");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("Reconnected to MongoDB");
      });

      mongoose.connection.on("connected", () => {
        logger.info("Connected to MongoDB", { poolSize: options.maxPoolSize });
      });

      const state = mongoose.connection.readyState;
      if (state === 1) {
        logger.info("Database connection established successfully");
        return;
      }
    } catch (error) {
      retries++;
      logger.error(`Connection attempt ${retries}/${MAX_RETRIES} failed`, {
        error: error.message,
        retries,
      });
      
      if (retries >= MAX_RETRIES) {
        logger.error("Max retries reached. Failed to connect to MongoDB", {
          error: error.message,
        });
        throw error;
      }
      
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
  }
};

export const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    if (state === 0) {
      return { healthy: false, error: "Not connected" };
    }
    
    await mongoose.connection.db.admin().ping();
    
    return {
      healthy: true,
      state: ["disconnected", "connected", "connecting", "disconnecting"][state],
      poolSize: mongoose.connection.readyState === 1 ? mongoose.connection.db?.serverConfig?.poolSize : null,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
};
