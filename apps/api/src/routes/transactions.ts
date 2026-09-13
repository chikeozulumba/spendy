import { Hono } from "hono";
import { sql } from "../db.js";
import { normalizeMerchant } from "../lib/merchant.js";
import { primaryCurrencyFor } from "../lib/currency.js";
import { requireAuth } from "../auth.js";

export const transactions = new Hono();
transactions.use("*", requireAuth);

const VALID_SOURCES = ["bank_statement", "telegram"] as const;

// Combined view across both origins (Section 7) — a statement-derived row and
// a Telegram-captured row share the same table/shape, just distinguished by
// `source`; `statement_id` is null for the latter (008_add_transactions_source.sql).
// A Telegram-sourced row has no statement of its own to carry a currency, so
// it falls back to the user's primary currency rather than showing none.
transactions.get("/", async (c) => {
  const userId = c.get("userId");
  const source = c.req.query("source");

  if (source && !VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
    return c.json({ error: `Invalid source filter: ${source}` }, 400);
  }

  const primaryCurrency = await primaryCurrencyFor(userId);

  const rows = await sql`
    SELECT
      t.id, t.statement_id, t.date, t.description, t.amount, t.direction, t.category,
      t.category_confidence, t.is_user_overridden, t.source, t.created_at,
      COALESCE(s.currency, ${primaryCurrency}) AS currency,
      s.bank_name, s.original_filename
    FROM transactions t
    LEFT JOIN statements s ON s.id = t.statement_id
    WHERE t.user_id = ${userId}
      ${source ? sql`AND t.source = ${source}` : sql``}
    ORDER BY t.date DESC, t.created_at DESC
  `;

  return c.json({ rows, primaryCurrency });
});

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
