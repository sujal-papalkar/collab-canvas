import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`Connecting to MongoDB URI: ${uri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log(' MongoDB connected successfully via provided URI.');
      return;
    } catch (err) {
      console.warn(` Failed to connect to MONGODB_URI (${err.message}). Falling back to Embedded MongoDB Server...`);
    }
  }

  try {
    console.log(' Starting Embedded MongoDB Server (Zero-config in-memory persistence)...');
    mongodInstance = await MongoMemoryServer.create();
    const memoryUri = mongodInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(` Embedded MongoDB connected at ${memoryUri}`);
  } catch (memErr) {
    console.error(' Failed to initialize Embedded MongoDB Server:', memErr);
    process.exit(1);
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};
