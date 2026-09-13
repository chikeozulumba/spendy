import { Hono } from "hono";
import { sql } from "../db.js";
import { env } from "../env.js";
import { requireAuth } from "../auth.js";

export const push = new Hono();

// Not behind requireAuth: this is a public, non-secret key the browser needs
// before a user has necessarily done anything auth-requiring yet, exactly
// like the frontend's own VITE_VAPID_PUBLIC_KEY build-time copy — this
// endpoint just avoids that value having to be duplicated/kept in sync in
// two places.
push.get("/vapid-public-key", (c) => c.json({ publicKey: env.vapidPublicKey }));

push.use("/subscribe", requireAuth);
push.use("/unsubscribe", requireAuth);

interface SubscriptionBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

push.post("/subscribe", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => null)) as SubscriptionBody | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return c.json({ error: "Missing 'endpoint'/'keys.p256dh'/'keys.auth'" }, 400);
  }

  // A subscription re-registered by a different user (e.g. someone signed
  // out and a different account signed in on the same browser) must move to
  // the new owner, not silently stay attributed to whoever subscribed it
  // first — endpoint is the browser's, not the account's.
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `;

  return c.json({ ok: true }, 201);
});

push.post("/unsubscribe", async (c) => {
  const userId = c.get("userId");
  const body = (await c.req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return c.json({ error: "Missing 'endpoint'" }, 400);

  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${body.endpoint} AND user_id = ${userId}`;
  return c.json({ ok: true });
});
