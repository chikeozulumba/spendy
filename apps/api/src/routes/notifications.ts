import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const notifications = new Hono();
notifications.use("*", requireAuth);

const LIST_LIMIT = 50;

// Every query below is scoped by `user_id = ${userId}` — one user's
// notifications must never be readable or writable by another.
notifications.get("/", async (c) => {
  const userId = c.get("userId");

  const rows = await sql`
    SELECT id, type, title, body, loan_id, read_at, created_at
    FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${LIST_LIMIT}
  `;
  const [unreadRow] = await sql<{ count: string }[]>`
    SELECT COUNT(*) FROM notifications WHERE user_id = ${userId} AND read_at IS NULL
  `;

  return c.json({ notifications: rows, unreadCount: Number(unreadRow?.count ?? 0) });
});

notifications.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  if (body?.read !== true) return c.json({ error: "Only {\"read\": true} is supported" }, 400);

  const [existing] = await sql`SELECT id FROM notifications WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  await sql`UPDATE notifications SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
  return c.json({ ok: true });
});

notifications.post("/read-all", async (c) => {
  const userId = c.get("userId");
  await sql`UPDATE notifications SET read_at = now() WHERE user_id = ${userId} AND read_at IS NULL`;
  return c.json({ ok: true });
});
