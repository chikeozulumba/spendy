import { sql } from "../db.js";

// The currency most of the user's statements are in — used wherever a
// currency-less row (no statement of its own, e.g. a Telegram-sourced
// transaction) needs a reasonable default rather than showing no currency
// at all.
export async function primaryCurrencyFor(userId: string): Promise<string> {
  const currencyCounts = await sql`
    SELECT currency, COUNT(*) AS count
    FROM statements
    WHERE user_id = ${userId} AND status = 'done'
    GROUP BY currency
    ORDER BY count DESC
  `;
  return currencyCounts[0]?.currency ?? "USD";
}
