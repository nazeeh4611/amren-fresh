import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { ok } from "../utils/apiResponse";
import { env } from "../config/env";
import { registerWebPushSubscription, unregisterWebPushSubscription } from "../services/pushNotificationService";

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

router.get(
  "/vapid-public-key",
  asyncHandler(async (_req, res) => {
    return ok(res, { publicKey: env.vapid.publicKey });
  })
);

router.post(
  "/subscribe",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(subscribeSchema),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body;
    await registerWebPushSubscription(req.user!.userId, { endpoint, p256dh: keys.p256dh, auth: keys.auth });
    return ok(res, { subscribed: true });
  })
);

router.post(
  "/unsubscribe",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(unsubscribeSchema),
  asyncHandler(async (req, res) => {
    await unregisterWebPushSubscription(req.user!.userId, req.body.endpoint);
    return ok(res, { unsubscribed: true });
  })
);

export default router;
