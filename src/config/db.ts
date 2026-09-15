import mongoose from "mongoose";
import { env } from "./env";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    // Sized for a single-region wholesale ordering app, not a huge fleet -
    // raise this (and the MongoDB Atlas tier's own connection limit) if
    // traffic grows enough to saturate it.
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
  });
  connected = true;
  // eslint-disable-next-line no-console
  console.log(`[db] connected to MongoDB`);
}

export async function disconnectDB(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
