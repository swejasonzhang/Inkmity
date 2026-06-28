import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import "./stripe.setup.js";

// CI runs ~900 tests across parallel workers under heavy contention; a small
// retry budget absorbs rare load-induced flakes without masking real failures
// (local runs, where CI is unset, still fail fast on the first error).
if (process.env.CI) {
  jest.retryTimes(2, { logErrorsBeforeRetry: true });
}

let mongoServer;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    process.env.DATABASE_AVAILABLE = 'true';
  } catch (error) {
    console.warn('MongoMemoryServer failed to start, using mock connection:', error.message);
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
  if (mongoose.connection.readyState === 1 && mongoServer) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});