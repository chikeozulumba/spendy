import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const telegram = new Hono();
telegram.use("*", requireAuth);

const TOKEN_TTL_MINUTES = 15;

// Generates a one-time token the user sends to the bot as "/start <token>"
// (Section 6.1). Short-lived on purpose — this is meant to be used
// immediately after generating it, not saved/reused.
telegram.post("/link-token", async (c) => {
  const userId = c.get("userId");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await sql`
    INSERT INTO telegram_link_tokens (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;

  return c.json({ token, expiresInMinutes: TOKEN_TTL_MINUTES }, 201);
});

// Lets the web app know whether to show Telegram-linked features (the
// documents list on TelegramLinkPage) without exposing the chat id itself.
telegram.get("/status", async (c) => {
  const userId = c.get("userId");
  const [user] = await sql<{ telegramChatId: string | null }[]>`
    SELECT telegram_chat_id FROM users WHERE id = ${userId}
  `;
  return c.json({ linked: !!user?.telegramChatId });
});
