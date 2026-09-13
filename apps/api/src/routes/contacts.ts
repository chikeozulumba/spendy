import { Hono } from "hono";
import { sql } from "../db.js";
import { primaryCurrencyFor } from "../lib/currency.js";
import { requireAuth } from "../auth.js";

export const contacts = new Hono();
contacts.use("*", requireAuth);

const VALID_SORTS = ["recent", "amount", "frequency"] as const;
type SortKey = (typeof VALID_SORTS)[number];

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

const SORT_CLAUSES: Record<SortKey, ReturnType<typeof sql>> = {
  recent: sql`last_interaction_at DESC NULLS LAST`,
  amount: sql`total_amount DESC`,
  frequency: sql`transaction_count DESC`,
};

// Every query below is scoped by `contacts.user_id = ${userId}` — one user's
// contacts/interactions must never be readable by another.
contacts.get("/", async (c) => {
  const userId = c.get("userId");
  const sortParam = c.req.query("sort") ?? "recent";
  const sort = (VALID_SORTS as readonly string[]).includes(sortParam) ? (sortParam as SortKey) : "recent";

  const primaryCurrency = await primaryCurrencyFor(userId);

  const rows = await sql`
    SELECT
      c.id, c.name, c.type,
      COUNT(t.id) AS transaction_count,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'debit'), 0) AS total_debit,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'credit'), 0) AS total_credit,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'debit'), 0)
        - COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'credit'), 0) AS total_amount,
      MIN(t.date) AS first_interaction_at,
      MAX(t.date) AS last_interaction_at
    FROM contacts c
    JOIN transactions t ON t.contact_id = c.id
    WHERE c.user_id = ${userId}
    GROUP BY c.id, c.name, c.type
    ORDER BY ${SORT_CLAUSES[sort]}
  `;

  return c.json({
    primaryCurrency,
    contacts: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      transactionCount: Number(r.transactionCount),
      totalDebit: r.totalDebit,
      totalCredit: r.totalCredit,
      firstInteractionAt: r.firstInteractionAt,
      lastInteractionAt: r.lastInteractionAt,
    })),
  });
});

contacts.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(c.req.query("pageSize") ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)
  );

  const [contact] = await sql`
    SELECT id, name, type, created_at FROM contacts WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!contact) return c.json({ error: "Not found" }, 404);

  const primaryCurrency = await primaryCurrencyFor(userId);

  const [metricsRow] = await sql`
    SELECT
      COUNT(*) AS transaction_count,
      COALESCE(SUM(amount) FILTER (WHERE direction = 'debit'), 0) AS total_debit,
      COALESCE(SUM(amount) FILTER (WHERE direction = 'credit'), 0) AS total_credit,
      MIN(date) AS first_interaction_at,
      MAX(date) AS last_interaction_at
    FROM transactions
    WHERE contact_id = ${id} AND user_id = ${userId}
  `;

  const topCategories = await sql`
    SELECT category, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
    FROM transactions
    WHERE contact_id = ${id} AND user_id = ${userId} AND category IS NOT NULL
    GROUP BY category
    ORDER BY total DESC
    LIMIT 5
  `;

  const transactionCount = Number(metricsRow?.transactionCount ?? 0);

  const transactions = await sql`
    SELECT
      t.id, t.date, t.description, t.amount, t.direction, t.category, t.source,
      COALESCE(s.currency, ${primaryCurrency}) AS currency,
      COALESCE(s.bank_name, t.bank_name) AS bank_name
    FROM transactions t
    LEFT JOIN statements s ON s.id = t.statement_id
    WHERE t.contact_id = ${id} AND t.user_id = ${userId}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;

  return c.json({
    contact: { id: contact.id, name: contact.name, type: contact.type, createdAt: contact.createdAt },
    primaryCurrency,
    metrics: {
      transactionCount,
      totalDebit: metricsRow?.totalDebit ?? "0",
      totalCredit: metricsRow?.totalCredit ?? "0",
      firstInteractionAt: metricsRow?.firstInteractionAt ?? null,
      lastInteractionAt: metricsRow?.lastInteractionAt ?? null,
    },
    topCategories: topCategories.map((r) => ({
      category: r.category,
      count: Number(r.count),
      total: r.total,
    })),
    transactions,
    pagination: {
      page,
      pageSize,
      total: transactionCount,
      totalPages: Math.max(1, Math.ceil(transactionCount / pageSize)),
    },
  });
});
