import webpush from "web-push";
import { User, IWebPushSubscription } from "../models/User";
import { env } from "../config/env";

/**
 * Sends push notifications via Expo's push service (mobile app) and Web
 * Push (admin browser dashboard). This is the extension point mentioned in
 * spec section 24/79 - swapping to FCM/APNs directly later only requires
 * changing this file.
 */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

if (env.vapid.publicKey && env.vapid.privateKey) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
}

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPush(tokens: string[], message: PushMessage): Promise<void> {
  const validTokens = tokens.filter((t) => t.startsWith("ExponentPushToken"));
  if (validTokens.length === 0) return;

  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        validTokens.map((to) => ({
          to,
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        }))
      ),
    });
  } catch (err) {
    // Notifications are best-effort and must never break order placement.
    // eslint-disable-next-line no-console
    console.error("[push] failed to send Expo push", err);
  }
}

async function sendWebPush(
  admins: { _id: unknown; webPushSubscriptions: IWebPushSubscription[] }[],
  message: PushMessage
): Promise<void> {
  if (!env.vapid.publicKey || !env.vapid.privateKey) return;

  const payload = JSON.stringify({ title: message.title, body: message.body, data: message.data ?? {} });

  for (const admin of admins) {
    for (const sub of admin.webPushSubscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked by the browser - drop it.
          await User.updateOne(
            { _id: admin._id },
            { $pull: { webPushSubscriptions: { endpoint: sub.endpoint } } }
          );
        } else {
          // eslint-disable-next-line no-console
          console.error("[push] failed to send web push", err);
        }
      }
    }
  }
}

export async function notifyAdminsOfNewOrder(shopName: string, orderNumber: number, totalDisplay: string) {
  const admins = await User.find({ role: "ADMIN", isActive: true });
  const tokens = admins.flatMap((a) => a.pushTokens);
  const message: PushMessage = {
    title: "New Order",
    body: `${shopName} placed Order #${orderNumber} - Total: ${totalDisplay}`,
    data: { orderNumber },
  };

  await Promise.all([
    tokens.length > 0 ? sendExpoPush(tokens, message) : Promise.resolve(),
    sendWebPush(admins, message),
  ]);
}

export async function registerPushToken(userId: string, token: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $addToSet: { pushTokens: token } });
}

export async function registerWebPushSubscription(
  userId: string,
  subscription: IWebPushSubscription
): Promise<void> {
  // Remove any existing entry for the same endpoint first so re-subscribing
  // (e.g. after browser data reset) doesn't create a stale duplicate.
  await User.updateOne({ _id: userId }, { $pull: { webPushSubscriptions: { endpoint: subscription.endpoint } } });
  await User.updateOne({ _id: userId }, { $push: { webPushSubscriptions: subscription } });
}

export async function unregisterWebPushSubscription(userId: string, endpoint: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $pull: { webPushSubscriptions: { endpoint } } });
}
