import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const insights = new Hono();
insights.use("*", requireAuth);

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

  const currencyCounts = await sql`
    SELECT currency, COUNT(*) AS count
    FROM statements
    WHERE user_id = ${userId} AND status = 'done'
    GROUP BY currency
    ORDER BY count DESC
  `;

  return c.json({
    rows,
    // The currency most of the user's statements are in — the chart shows
    // only this currency's rows rather than mixing units.
    primaryCurrency: currencyCounts[0]?.currency ?? "USD",
  });
});
