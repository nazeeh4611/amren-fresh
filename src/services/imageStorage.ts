import path from "path";
import fs from "fs";
import multer from "multer";
import { env } from "../config/env";

/**
 * Minimal pluggable image storage. Ships with local-disk storage (served
 * statically from /uploads) so the app works out of the box in development.
 *
 * For production, swap this module's `saveUpload` for an upload to Cloudinary,
 * S3, or Supabase Storage - none of the calling code needs to change, it only
 * depends on getting back a public imageUrl. Credentials go in .env
 * (CLOUDINARY_* / AWS_* etc.) per .env.example.
 */

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function publicUrlForUpload(filename: string): string {
  return `${env.apiUrl}/uploads/${filename}`;
}

export const uploadsDir = UPLOAD_DIR;
