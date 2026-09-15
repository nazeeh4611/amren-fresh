import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadMiddleware, publicUrlForUpload } from "../services/imageStorage";
import { asyncHandler } from "../middleware/errorHandler";
import { ok, ApiError } from "../utils/apiResponse";

const router = Router();

router.post(
  "/image",
  requireAuth,
  requireRole("ADMIN"),
  uploadMiddleware.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError("No image was uploaded.", 422);
    return ok(res, { url: publicUrlForUpload(req.file.filename) }, 201);
  })
);

export default router;
