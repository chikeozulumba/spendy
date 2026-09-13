import { Hono } from "hono";
import { sql } from "../db.js";
import { primaryCurrencyFor } from "../lib/currency.js";
import { requireAuth } from "../auth.js";

export const contacts = new Hono();
contacts.use("*", requireAuth);

const VALID_SORTS = ["recent", "amount", "frequency"] as const;
type SortKey = (typeof VALID_SORTS)[number];

const VALID_SCOPES = ["primary", "all"] as const;
type ScopeKey = (typeof VALID_SCOPES)[number];

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
  const scopeParam = c.req.query("scope") ?? "primary";
  const scope = (VALID_SCOPES as readonly string[]).includes(scopeParam) ? (scopeParam as ScopeKey) : "primary";
  const q = c.req.query("q")?.trim();

  const primaryCurrency = await primaryCurrencyFor(userId);

  // LEFT JOIN (not the INNER JOIN this used before merging existed) — a
  // contact that's been merged away typically has zero transactions still
  // pointing at it directly (they all moved to the primary), and scope=all
  // still needs to list it rather than have it silently vanish.
  const rows = await sql`
    SELECT
      c.id, c.name, c.type, c.merged_into_id, m.name AS merged_into_name,
      COUNT(t.id) AS transaction_count,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'debit'), 0) AS total_debit,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'credit'), 0) AS total_credit,
      COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'debit'), 0)
        - COALESCE(SUM(t.amount) FILTER (WHERE t.direction = 'credit'), 0) AS total_amount,
      MIN(t.date) AS first_interaction_at,
      MAX(t.date) AS last_interaction_at
    FROM contacts c
    LEFT JOIN transactions t ON t.contact_id = c.id
    LEFT JOIN contacts m ON m.id = c.merged_into_id
    WHERE c.user_id = ${userId}
      ${scope === "primary" ? sql`AND c.merged_into_id IS NULL` : sql``}
      ${q ? sql`AND c.name ILIKE ${"%" + q + "%"}` : sql``}
    GROUP BY c.id, c.name, c.type, c.merged_into_id, m.name
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
      mergedIntoId: r.mergedIntoId,
      mergedIntoName: r.mergedIntoName,
    })),
  });
});

// Folds `mergeContactIds` into `primaryContactId`: every transaction
// currently attached to any of them is reassigned to the primary, and each
// merged contact is relabeled to the primary's type and marked with
// merged_into_id so it drops out of the default (scope=primary) list view.
//
// Flattened to a single level: if any of the ids being merged were
// themselves already a primary for earlier merges, their existing
// "children" are re-pointed straight at the new primary too, rather than
// left chained through a contact that's no longer the top of its group. And
// if the chosen primary was itself previously merged into someone else,
// that's undone here — it's the active primary of this group now.
contacts.post("/merge", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const primaryContactId = body?.primaryContactId;
  const mergeContactIds: unknown = body?.mergeContactIds;

  if (typeof primaryContactId !== "string" || !Array.isArray(mergeContactIds) || mergeContactIds.length === 0) {
    return c.json({ error: "Provide 'primaryContactId' and a non-empty 'mergeContactIds' array" }, 400);
  }
  const secondaryIds = [...new Set(mergeContactIds.filter((id): id is string => typeof id === "string"))].filter(
    (id) => id !== primaryContactId
  );
  if (secondaryIds.length === 0) {
    return c.json({ error: "'mergeContactIds' must contain at least one contact other than the primary" }, 400);
  }

  const allIds = [primaryContactId, ...secondaryIds];
  const owned = await sql<{ id: string }[]>`
    SELECT id FROM contacts WHERE id IN ${sql(allIds)} AND user_id = ${userId}
  `;
  if (owned.length !== allIds.length) {
    return c.json({ error: "One or more contacts were not found" }, 404);
  }

  const [primary] = await sql<{ type: string }[]>`SELECT type FROM contacts WHERE id = ${primaryContactId}`;
  if (!primary) return c.json({ error: "Primary contact not found" }, 404);

  await sql.begin(async (trx) => {
    await trx`
      UPDATE transactions SET contact_id = ${primaryContactId}
      WHERE user_id = ${userId} AND contact_id IN ${trx(secondaryIds)}
    `;
    // Flatten: anything that pointed at one of the now-merged secondaries
    // (an earlier merge's children) gets re-pointed at the new primary too,
    // and the primary itself is un-merged in case it was a secondary before.
    await trx`
      UPDATE contacts
      SET merged_into_id = ${primaryContactId}, type = ${primary.type}, updated_at = now()
      WHERE user_id = ${userId} AND (id IN ${trx(secondaryIds)} OR merged_into_id IN ${trx(secondaryIds)})
    `;
    await trx`
      UPDATE contacts SET merged_into_id = NULL, updated_at = now()
      WHERE id = ${primaryContactId} AND merged_into_id IS NOT NULL
    `;
  });

  return c.json({ ok: true, primaryContactId, mergedCount: secondaryIds.length });
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
