import webpush from "web-push";
import { sql } from "../db.js";
import { env } from "../env.js";

webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sends to every device/browser the user has enabled notifications on — a
// user can have more than one push_subscriptions row. A subscription the
// browser has since revoked comes back as 404/410 from the push service;
// that's expected and just means "stop trying this one," not a real error,
// so those rows are pruned rather than logged as failures.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await sql<
    { id: string; endpoint: string; p256dh: string; auth: string }[]
  >`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`;

  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
        } else {
          console.error(`Push notification failed for subscription ${sub.id}:`, err);
        }
      }
    })
  );
}
