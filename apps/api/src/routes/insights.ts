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
