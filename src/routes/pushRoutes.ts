import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { ok } from "../utils/apiResponse";
import { registerPushToken } from "../services/pushNotificationService";

const router = Router();

const registerSchema = z.object({ token: z.string().min(1) });

router.post(
  "/register",
  requireAuth,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    await registerPushToken(req.user!.userId, req.body.token);
    return ok(res, { registered: true });
  })
);

export default router;
