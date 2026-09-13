import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";

export const loans = new Hono();
loans.use("*", requireAuth);

const VALID_STATUSES = ["outstanding", "repaid", "overdue", "written_off"] as const;

// Every query below is scoped by `user_id = ${userId}` — one user's loan book
// must never be readable or writable by another (Section 9).
loans.get("/", async (c) => {
  const userId = c.get("userId");
  const status = c.req.query("status");

  if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return c.json({ error: `Invalid status filter: ${status}` }, 400);
  }

  const rows = await sql`
    SELECT l.id, l.transaction_id, l.counterparty, l.amount, l.expected_repayment_date,
           l.status, l.notes, l.created_at, t.description, t.date AS transaction_date
    FROM loan_book l
    JOIN transactions t ON t.id = l.transaction_id
    WHERE l.user_id = ${userId}
      ${status ? sql`AND l.status = ${status}` : sql``}
    ORDER BY
      CASE WHEN l.status = 'overdue' THEN 0 WHEN l.status = 'outstanding' THEN 1 ELSE 2 END,
      l.expected_repayment_date ASC NULLS LAST
  `;

  return c.json(rows);
});

loans.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const [existing] = await sql`SELECT id FROM loan_book WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  const status = body?.status;
  const notes = body?.notes;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return c.json({ error: `Invalid status: ${status}` }, 400);
  }
  if (status === undefined && notes === undefined) {
    return c.json({ error: "Provide 'status' and/or 'notes'" }, 400);
  }

  const [updated] = await sql`
    UPDATE loan_book
    SET
      status = COALESCE(${status ?? null}, status),
      notes = CASE WHEN ${notes !== undefined} THEN ${notes ?? null} ELSE notes END,
      updated_at = now()
    WHERE id = ${id}
    RETURNING id, status, notes
  `;

  return c.json(updated);
});
