import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const budgets = new Hono();
budgets.use("*", requireAuth);

// Lists budgets whose period overlaps the given range (usually the exact
// range a period picker resolved to, e.g. one calendar month) rather than
// requiring an exact date match — a budget set once for "this month" should
// still show up if the caller's range is computed slightly differently.
budgets.get("/", async (c) => {
  const userId = c.get("userId");
  const periodStart = c.req.query("periodStart");
  const periodEnd = c.req.query("periodEnd");
  if (!periodStart || !periodEnd) {
    return c.json({ error: "Missing 'periodStart'/'periodEnd' query params" }, 400);
  }

  const rows = await sql`
    SELECT b.id, b.scope_id, s.name AS scope_name, b.period_start, b.period_end,
           b.amount, b.currency
    FROM budgets b
    JOIN scopes s ON s.id = b.scope_id
    WHERE b.user_id = ${userId}
      AND b.period_start <= ${periodEnd}::date
      AND b.period_end >= ${periodStart}::date
    ORDER BY s.name ASC
  `;
  return c.json(rows);
});

budgets.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const { scopeId, periodStart, periodEnd, amount, currency } = body ?? {};

  if (!scopeId || !periodStart || !periodEnd || !amount || !currency) {
    return c.json(
      { error: "Missing one of: scopeId, periodStart, periodEnd, amount, currency" },
      400
    );
  }

  const [scope] = await sql`SELECT id FROM scopes WHERE id = ${scopeId} AND user_id = ${userId}`;
  if (!scope) return c.json({ error: "Scope not found" }, 404);

  const [budget] = await sql`
    INSERT INTO budgets (user_id, scope_id, period_start, period_end, amount, currency)
    VALUES (${userId}, ${scopeId}, ${periodStart}, ${periodEnd}, ${amount}, ${currency})
    ON CONFLICT (scope_id, period_start, period_end)
    DO UPDATE SET amount = EXCLUDED.amount, currency = EXCLUDED.currency, updated_at = now()
    RETURNING id, scope_id, period_start, period_end, amount, currency
  `;
  return c.json(budget, 201);
});

budgets.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const [existing] = await sql`SELECT id FROM budgets WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (typeof body?.amount !== "number" || body.amount <= 0) {
    return c.json({ error: "Missing/invalid 'amount'" }, 400);
  }

  await sql`UPDATE budgets SET amount = ${body.amount}, updated_at = now() WHERE id = ${id}`;
  return c.json({ id, amount: body.amount });
});

budgets.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [existing] = await sql`SELECT id FROM budgets WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  await sql`DELETE FROM budgets WHERE id = ${id}`;
  return c.json({ ok: true });
});
