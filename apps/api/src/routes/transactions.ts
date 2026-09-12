import { Hono } from "hono";
import { sql } from "../db.js";
import { normalizeMerchant } from "../lib/merchant.js";
import { requireAuth } from "../auth.js";

export const transactions = new Hono();
transactions.use("*", requireAuth);

transactions.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const category = body?.category;
  if (typeof category !== "string" || !category.trim()) {
    return c.json({ error: "Missing 'category'" }, 400);
  }

  const [validCategory] = await sql`SELECT name FROM categories WHERE name = ${category}`;
  if (!validCategory) return c.json({ error: "Unknown category" }, 400);

  const [tx] = await sql`
    SELECT id, description FROM transactions WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!tx) return c.json({ error: "Not found" }, 404);

  const merchantPattern = normalizeMerchant(tx.description as string);

  await sql.begin(async (trx) => {
    await trx`
      UPDATE transactions
      SET category = ${category}, is_user_overridden = true, category_confidence = 1
      WHERE id = ${id}
    `;
    await trx`
      INSERT INTO category_overrides (user_id, merchant_pattern, category)
      VALUES (${userId}, ${merchantPattern}, ${category})
      ON CONFLICT (user_id, merchant_pattern)
      DO UPDATE SET category = EXCLUDED.category, created_at = now()
    `;
  });

  return c.json({ ok: true });
});
