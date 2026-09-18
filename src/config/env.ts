import dotenv from "dotenv";

dotenv.config();

const isProduction = (process.env.NODE_ENV ?? "development") === "production";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// The insecure fallback only exists to make `npm run dev` work out of the
// box. In production this MUST come from a real secret - fail fast at
// startup rather than silently signing tokens with a guessable key.
const jwtSecret = isProduction
  ? required("JWT_SECRET")
  : required("JWT_SECRET", "dev-only-insecure-secret-change-me");

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "4000", 10),
  mongodbUri: required("MONGODB_URI", "mongodb://127.0.0.1:27017/amren-fresh"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? "",
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:hello@amren.ae",
  },
  isProduction,
};
