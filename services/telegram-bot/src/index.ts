import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Redis } from "ioredis";
import { env } from "./env.js";
import { redis } from "./redis.js";
import { chatIdFromTtlSentinelKey, getSession, deleteSession } from "./session.js";
import { logAbandonedSession } from "./sessionLog.js";
import { sendMessage } from "./telegram.js";
import { handleUpdate } from "./webhook.js";
import type { TelegramUpdate } from "./telegram.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/telegram/webhook", async (c) => {
  // Section 9/G1: reject anything that doesn't carry Telegram's own secret
  // token before parsing/processing the body at all.
  const secret = c.req.header("x-telegram-bot-api-secret-token");
  if (secret !== env.telegramWebhookSecret) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const update = (await c.req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return c.json({ error: "Bad Request" }, 400);

  // Telegram expects a fast 2xx response and will retry otherwise — the
  // actual handling (LLM calls, R2 upload, etc.) runs after responding, same
  // "respond now, process async" shape as routes/statements.ts's upload
  // handler in the main API.
  void handleUpdate(update).catch((err) => {
    console.error("handleUpdate failed:", err);
  });

  return c.json({ ok: true });
});

// Section 6.4 condition 2 (inactivity timeout): see session.ts's comment on
// why a *sentinel* key's expiry (not the session data key's) is what's
// subscribed to here — Redis "expired" events carry no value, only the key
// name, so the real session data has to still be readable when this fires.
async function watchSessionExpiry() {
  const subscriber = new Redis(env.redisUrl);

  try {
    await redis.config("SET", "notify-keyspace-events", "Ex");
  } catch (err) {
    console.warn(
      "Could not enable Redis keyspace notifications (CONFIG SET may be restricted on this instance) — inactivity-timeout sessions will not be logged/notified:",
      err
    );
    return;
  }

  await subscriber.psubscribe("__keyevent@*__:expired");
  subscriber.on("pmessage", (_pattern, _channel, expiredKey) => {
    const chatId = chatIdFromTtlSentinelKey(expiredKey);
    if (!chatId) return;

    void (async () => {
      const session = await getSession(chatId);
      if (!session) return; // already ended via /cancel or "done" in the meantime
      await logAbandonedSession(session);
      await deleteSession(chatId);
      await sendMessage(
        chatId,
        "Your session timed out from inactivity — nothing was logged. Send the document again to start over."
      ).catch((err) => console.error("Failed to send timeout notice:", err));
    })().catch((err) => console.error("Session expiry handling failed:", err));
  });
}

void watchSessionExpiry();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`telegram-bot listening on http://localhost:${info.port}`);
});
