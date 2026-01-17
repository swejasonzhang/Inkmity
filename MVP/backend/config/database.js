import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function initDatabase() {
  try {
    if (isConnected) {
      logger.debug('Database already connected');
      return;
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(config.database.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info('MongoDB connected successfully', {
      uri: config.database.uri.replace(/\/\/.*@/, '//***:***@') // Mask credentials in logs
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', { error: error.message });
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', { error: error.message });
    throw error;
  }
}

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    host: mongoose.connection.host,
  };
}

export async function closeDatabase() {
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', { error: error.message });
  }
}