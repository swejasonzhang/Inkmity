import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import "./stripe.setup.js";

let mongoServer;

beforeAll(async () => {
  try {
    // Try to start MongoMemoryServer with minimal configuration
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    // Set environment variable to indicate database is available
    process.env.DATABASE_AVAILABLE = 'true';
  } catch (error) {
    console.warn('MongoMemoryServer failed to start, using mock connection:', error.message);
    // Fallback: create a mock connection that doesn't actually connect
    // This allows tests to run without database operations
    mongoServer = null;
    process.env.DATABASE_AVAILABLE = 'false';
  }
});

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Only clean up collections if we have an actual database connection
  if (mongoose.connection.readyState === 1 && mongoServer) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});