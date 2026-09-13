import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const insights = new Hono();
insights.use("*", requireAuth);

// The currency most of the user's statements are in — used by both endpoints
// below so their charts show one currency's worth of totals rather than
// silently summing statements in different currencies together.
async function primaryCurrencyFor(userId: string): Promise<string> {
  const currencyCounts = await sql`
    SELECT currency, COUNT(*) AS count
    FROM statements
    WHERE user_id = ${userId} AND status = 'done'
    GROUP BY currency
    ORDER BY count DESC
  `;
  return currencyCounts[0]?.currency ?? "USD";
}

// Cross-statement overview for the home page: total spend per category per
// year, across every completed statement the user has. Grouped by currency
// too (not just year+category) because each statement's currency is now
// independently inferred — a user with statements in more than one currency
// must not have their totals silently summed together as if fungible.
insights.get("/spending-by-year", async (c) => {
  const userId = c.get("userId");

  const rows = await sql`
    SELECT
      EXTRACT(YEAR FROM t.date)::int AS year,
      t.category,
      s.currency,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN statements s ON s.id = t.statement_id
    WHERE t.user_id = ${userId}
      AND t.direction = 'debit'
      AND t.category IS NOT NULL
      AND s.status = 'done'
    GROUP BY year, t.category, s.currency
    ORDER BY year ASC
  `;

  return c.json({ rows, primaryCurrency: await primaryCurrencyFor(userId) });
});

// Per-scope actual spend vs budget for one period (usually a calendar
// month). A scope with no budget set for this exact period still appears,
// with budgetAmount null — the UI treats "no budget" and "under budget" as
// different states, so it can't just default the amount to 0.
insights.get("/budget-summary", async (c) => {
  const userId = c.get("userId");
  const periodStart = c.req.query("periodStart");
  const periodEnd = c.req.query("periodEnd");
  if (!periodStart || !periodEnd) {
    return c.json({ error: "Missing 'periodStart'/'periodEnd' query params" }, 400);
  }
  const currency = c.req.query("currency") ?? (await primaryCurrencyFor(userId));

  const rows = await sql`
    SELECT
      s.id AS scope_id,
      s.name AS scope_name,
      COALESCE(spend.total, 0) AS actual,
      b.id AS budget_id,
      b.amount AS budget_amount
    FROM scopes s
    LEFT JOIN (
      SELECT sc.scope_id, SUM(t.amount) AS total
      FROM scope_categories sc
      JOIN transactions t ON t.category = sc.category
      JOIN statements st ON st.id = t.statement_id
      WHERE t.user_id = ${userId}
        AND t.direction = 'debit'
        AND st.status = 'done'
        AND st.currency = ${currency}
        AND t.date BETWEEN ${periodStart}::date AND ${periodEnd}::date
      GROUP BY sc.scope_id
    ) spend ON spend.scope_id = s.id
    LEFT JOIN budgets b
      ON b.scope_id = s.id
      AND b.period_start = ${periodStart}::date
      AND b.period_end = ${periodEnd}::date
    WHERE s.user_id = ${userId}
    ORDER BY s.name ASC
  `;

  return c.json({
    currency,
    rows: rows.map((r) => ({
      scopeId: r.scopeId,
      scopeName: r.scopeName,
      actual: r.actual,
      budgetId: r.budgetId,
      budgetAmount: r.budgetAmount,
      overBudget: r.budgetAmount !== null && Number(r.actual) > Number(r.budgetAmount),
    })),
  });
});

// Category-level totals for two arbitrary date ranges side by side, for the
// period-over-period comparison view. Categories that only have spend in one
// of the two periods still appear, with 0 for the other side.
insights.get("/period-comparison", async (c) => {
  const userId = c.get("userId");
  const aStart = c.req.query("aStart");
  const aEnd = c.req.query("aEnd");
  const bStart = c.req.query("bStart");
  const bEnd = c.req.query("bEnd");
  if (!aStart || !aEnd || !bStart || !bEnd) {
    return c.json({ error: "Missing one of: aStart, aEnd, bStart, bEnd" }, 400);
  }
  const currency = c.req.query("currency") ?? (await primaryCurrencyFor(userId));

  async function totalsFor(start: string, end: string) {
    const rows = await sql<{ category: string; total: string }[]>`
      SELECT t.category, SUM(t.amount) AS total
      FROM transactions t
      JOIN statements s ON s.id = t.statement_id
      WHERE t.user_id = ${userId}
        AND t.direction = 'debit'
        AND t.category IS NOT NULL
        AND s.status = 'done'
        AND s.currency = ${currency}
        AND t.date BETWEEN ${start}::date AND ${end}::date
      GROUP BY t.category
    `;
    const byCategory = new Map(rows.map((r) => [r.category, Number(r.total)]));
    const total = rows.reduce((sum, r) => sum + Number(r.total), 0);
    return { byCategory, total };
  }

  const [a, b] = await Promise.all([totalsFor(aStart, aEnd), totalsFor(bStart, bEnd)]);
  const categories = Array.from(new Set([...a.byCategory.keys(), ...b.byCategory.keys()])).sort();

  return c.json({
    currency,
    totalA: a.total,
    totalB: b.total,
    categories: categories.map((category) => ({
      category,
      totalA: a.byCategory.get(category) ?? 0,
      totalB: b.byCategory.get(category) ?? 0,
    })),
  });
});

// Total spend per bank (statements grouped by their inferred bank_name),
// across every completed statement — "how much has each bank taken in".
// Statements where the bank couldn't be identified are grouped under
// "Unknown" rather than silently dropped from the total.
insights.get("/spending-by-bank", async (c) => {
  const userId = c.get("userId");

  const rows = await sql`
    SELECT
      COALESCE(s.bank_name, 'Unknown') AS bank_name,
      s.currency,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN statements s ON s.id = t.statement_id
    WHERE t.user_id = ${userId}
      AND t.direction = 'debit'
      AND s.status = 'done'
    GROUP BY bank_name, s.currency
    ORDER BY total DESC
  `;

  return c.json({ rows, primaryCurrency: await primaryCurrencyFor(userId) });
});
