import { createHash } from "node:crypto";
import { Hono } from "hono";
import { sql } from "../db.js";
import { putEncrypted, storagePathFor, deleteObject } from "../storage.js";
import { triggerProcessing } from "../lib/internalClient.js";
import { sendPushToUser } from "../lib/push.js";
import { requireAuth } from "../auth.js";
import { ADMIN_EMAIL, MAX_STATEMENTS_PER_USER } from "../limits.js";

export const statements = new Hono();
statements.use("*", requireAuth);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

statements.post("/", async (c) => {
  const userId = c.get("userId");
  const form = await c.req.formData();
  const file = form.get("file");
  const password = form.get("password");
  const bankNameField = form.get("bankName");
  // "" (no selection) and "null"/whitespace-only should all mean "not provided" —
  // NULL is what lets the LLM's own inference during processing fill it in later.
  const bankName =
    typeof bankNameField === "string" && bankNameField.trim() ? bankNameField.trim() : null;

  if (!(file instanceof File)) {
    return c.json({ error: "Missing 'file' field (PDF)" }, 400);
  }
  if (file.type && file.type !== "application/pdf") {
    return c.json({ error: "Only PDF uploads are supported" }, 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return c.json({ error: "File too large (25MB max)" }, 400);
  }

  console.log(
    `[statements] upload received: user=${userId} file=${file.name} size=${file.size} bank=${bankName ?? "unset"}`
  );

  // Non-admin accounts are capped on distinct statements processed — checked
  // before any storage write or AI processing, both of which cost real money.
  if (c.get("userEmail") !== ADMIN_EMAIL) {
    const [row] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM statements WHERE user_id = ${userId}
    `;
    if ((row?.count ?? 0) >= MAX_STATEMENTS_PER_USER) {
      return c.json(
        { error: `You've reached the limit of ${MAX_STATEMENTS_PER_USER} bank statements for this account.` },
        403
      );
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(bytes).digest("hex");

  // Check before doing any storage write or triggering AI processing — both
  // cost real money, and re-processing a file byte-for-byte identical to one
  // already on file would just reproduce the same statement a second time.
  const [existing] = await sql<{ id: string; originalFilename: string }[]>`
    SELECT id, original_filename FROM statements
    WHERE user_id = ${userId} AND file_hash = ${fileHash}
  `;
  if (existing) {
    console.log(`[statements] upload rejected: duplicate of ${existing.id} (user=${userId})`);
    return c.json(
      {
        error: `This file was already uploaded as "${existing.originalFilename}"`,
        statementId: existing.id,
      },
      409
    );
  }

  const [statement] = await sql<{ id: string }[]>`
    INSERT INTO statements (user_id, original_filename, status, bank_name, file_hash)
    VALUES (${userId}, ${file.name}, 'uploaded', ${bankName}, ${fileHash})
    RETURNING id
  `;
  if (!statement) throw new Error("Failed to create statement row");
  const statementId = statement.id;
  console.log(`[statements] statement row created: id=${statementId} user=${userId}`);

  const storagePath = storagePathFor(statementId, "original.pdf");
  await putEncrypted(storagePath, bytes);
  await sql`UPDATE statements SET storage_path = ${storagePath} WHERE id = ${statementId}`;
  console.log(`[statements] statement=${statementId} original PDF stored at ${storagePath}`);

  const [job] = await sql<{ id: string }[]>`
    INSERT INTO jobs (statement_id, status) VALUES (${statementId}, 'pending')
    RETURNING id
  `;
  if (!job) throw new Error("Failed to create job row");

  // Processing is asynchronous from the client's perspective: we respond as
  // soon as the file is stored, and the client polls GET /statements/:id for
  // status. `password` is passed only in-memory to this one call — never
  // persisted to `jobs` or `statements`.
  //
  // This runs detached from the request/response cycle — if it throws
  // anything not already caught inside runProcessing, that becomes an
  // unhandled promise rejection with no HTTP response to attach it to, which
  // depending on the Node runtime's config can silently vanish (or, worse,
  // crash the process). runProcessing has its own top-level try/catch for
  // exactly this reason; this catch here is a last-resort backstop.
  void runProcessing(statementId, job.id, typeof password === "string" ? password : undefined).catch(
    (err) => {
      console.error(`[statements] runProcessing threw unexpectedly for statement=${statementId}:`, err);
    }
  );

  return c.json({ id: statementId, status: "uploaded" }, 201);
});

statements.post("/:id/reprocess", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const password = (await c.req.json().catch(() => ({})))?.password as string | undefined;

  const [existing] = await sql`
    SELECT id, storage_path FROM statements WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!existing.storagePath) {
    return c.json({ error: "Original PDF was purged by retention policy; please re-upload" }, 409);
  }

  await sql`UPDATE statements SET status = 'processing', failure_reason = NULL WHERE id = ${id}`;
  const [job] = await sql<{ id: string }[]>`
    INSERT INTO jobs (statement_id, status) VALUES (${id}, 'pending') RETURNING id
  `;
  if (!job) throw new Error("Failed to create job row");
  void runProcessing(id, job.id, password);

  return c.json({ id, status: "processing" });
});

// Assigns/reassigns which bank a statement belongs to — a manual correction
// or fill-in for a statement the LLM never confidently identified a bank
// for. Deliberately narrow (bank_name only) rather than a general-purpose
// PATCH; other fields on a statement aren't user-editable.
statements.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const bankNameField = body?.bankName;

  if (typeof bankNameField !== "string" || !bankNameField.trim()) {
    return c.json({ error: "Missing 'bankName'" }, 400);
  }
  const bankName = bankNameField.trim();

  const [existing] = await sql`SELECT id FROM statements WHERE id = ${id} AND user_id = ${userId}`;
  if (!existing) return c.json({ error: "Not found" }, 404);

  await sql`UPDATE statements SET bank_name = ${bankName}, updated_at = now() WHERE id = ${id}`;
  return c.json({ id, bankName });
});

// Deletes a statement and everything derived from it: transactions and jobs
// cascade at the DB level (ON DELETE CASCADE in 001_init.sql), so the only
// thing this handler does beyond the row delete itself is purge the raw PDF
// from object storage — that's not a DB relation and would otherwise be
// orphaned. Budgets/scopes are untouched: they're independent of any one
// statement, and a scope's "actual spend" simply recomputes lower once this
// statement's transactions are gone.
statements.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [existing] = await sql<{ storagePath: string | null }[]>`
    SELECT storage_path FROM statements WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (existing.storagePath) {
    await deleteObject(existing.storagePath);
  }
  await sql`DELETE FROM statements WHERE id = ${id}`;

  return c.json({ ok: true });
});

statements.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await sql`
    SELECT id, original_filename, status, opening_balance, closing_balance,
           statement_period_start, statement_period_end, reconciliation_ok,
           currency, bank_name, created_at
    FROM statements WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return c.json(rows);
});

// Registered before "/:id" — Hono matches routes in registration order, and
// "/:id" would otherwise swallow this as a request for the statement whose
// id is literally "banks".
statements.get("/banks", async (c) => {
  const userId = c.get("userId");
  const rows = await sql<{ bankName: string }[]>`
    SELECT DISTINCT bank_name
    FROM statements
    WHERE user_id = ${userId} AND bank_name IS NOT NULL
    ORDER BY bank_name ASC
  `;
  return c.json(rows.map((r) => r.bankName));
});

statements.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [row] = await sql`
    SELECT id, original_filename, status, failure_reason, opening_balance, closing_balance,
           statement_period_start, statement_period_end, reconciliation_ok,
           reconciliation_note, summary, currency, bank_name, created_at
    FROM statements WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

statements.get("/:id/transactions", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [owned] = await sql`SELECT id FROM statements WHERE id = ${id} AND user_id = ${userId}`;
  if (!owned) return c.json({ error: "Not found" }, 404);

  const rows = await sql`
    SELECT id, date, description, amount, direction, category, category_confidence,
           is_user_overridden
    FROM transactions WHERE statement_id = ${id} ORDER BY date ASC
  `;
  return c.json(rows);
});

statements.get("/:id/insights", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [statement] = await sql`
    SELECT id, summary, reconciliation_ok, reconciliation_note
    FROM statements WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!statement) return c.json({ error: "Not found" }, 404);

  const breakdown = await sql`
    SELECT category, SUM(amount) AS total, COUNT(*) AS count
    FROM transactions
    WHERE statement_id = ${id} AND direction = 'debit'
    GROUP BY category
    ORDER BY total DESC
  `;

  const overTime = await sql`
    SELECT date, direction, SUM(amount) AS total
    FROM transactions
    WHERE statement_id = ${id}
    GROUP BY date, direction
    ORDER BY date ASC
  `;

  const topMerchants = await sql`
    SELECT description, SUM(amount) AS total, COUNT(*) AS count
    FROM transactions
    WHERE statement_id = ${id} AND direction = 'debit'
    GROUP BY description
    ORDER BY total DESC
    LIMIT 10
  `;

  return c.json({
    summary: statement.summary,
    reconciliationOk: statement.reconciliationOk,
    reconciliationNote: statement.reconciliationNote,
    categoryBreakdown: breakdown,
    spendOverTime: overTime,
    topMerchants,
  });
});

async function runProcessing(statementId: string, jobId: string, password: string | undefined) {
  try {
    await sql`UPDATE jobs SET status = 'running', attempts = attempts + 1 WHERE id = ${jobId}`;
    await sql`UPDATE statements SET status = 'processing' WHERE id = ${statementId}`;
    console.log(`[statements] statement=${statementId} job=${jobId} handed off to pdf-service`);

    const result = await triggerProcessing(statementId, password);

    const [statement] = await sql<{ userId: string; originalFilename: string }[]>`
      SELECT user_id, original_filename FROM statements WHERE id = ${statementId}
    `;
    if (!statement) {
      console.error(`[statements] statement=${statementId} vanished before its result could be recorded`);
    }

    if (result.ok) {
      await sql`UPDATE jobs SET status = 'succeeded' WHERE id = ${jobId}`;
      console.log(`[statements] statement=${statementId} job=${jobId} succeeded`);
      // pdf-service itself sets status='done' once it has written transactions;
      // this is just a safety net in case it crashed after responding ok=true.
      if (statement) {
        await sendPushToUser(statement.userId, {
          title: "Statement processed",
          body: `${statement.originalFilename} is done — your transactions are ready.`,
          url: `/statements/${statementId}`,
        });
      }
    } else {
      console.error(`[statements] statement=${statementId} job=${jobId} failed: ${result.error}`);
      await sql`UPDATE jobs SET status = 'failed', last_error = ${result.error ?? "unknown error"} WHERE id = ${jobId}`;
      await sql`
        UPDATE statements
        SET status = 'failed', failure_reason = ${result.error ?? "unknown error"}
        WHERE id = ${statementId} AND status != 'done'
      `;
      if (statement) {
        await sendPushToUser(statement.userId, {
          title: "Statement processing failed",
          body: `${statement.originalFilename}: ${result.error ?? "unknown error"}`,
          url: `/statements/${statementId}`,
        });
      }
    }
  } catch (err) {
    // Anything unexpected here (a DB write failing, sendPushToUser throwing,
    // etc.) must still leave the statement in a terminal, visible state
    // rather than stuck on "processing" forever with nothing in the UI to
    // explain why.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[statements] statement=${statementId} job=${jobId} runProcessing crashed:`, err);
    await sql`UPDATE jobs SET status = 'failed', last_error = ${message} WHERE id = ${jobId}`.catch((e) =>
      console.error(`[statements] also failed to record job failure for job=${jobId}:`, e)
    );
    await sql`
      UPDATE statements SET status = 'failed', failure_reason = ${message}
      WHERE id = ${statementId} AND status != 'done'
    `.catch((e) => console.error(`[statements] also failed to record statement failure for ${statementId}:`, e));
  }
}

// Called by the retention cleanup routine (or manually) to purge a raw PDF
// while keeping already-extracted transaction data intact.
export async function purgeStatementFile(statementId: string, storagePath: string) {
  await deleteObject(storagePath);
  await sql`UPDATE statements SET storage_path = NULL WHERE id = ${statementId}`;
}
