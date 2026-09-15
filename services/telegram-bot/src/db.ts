import postgres from "postgres";
import { env } from "./env.js";
import { ADMIN_EMAIL } from "./limits.js";
import { decryptBuffer } from "./crypto.js";

export const sql = postgres(env.databaseUrl, {
  transform: postgres.camel,
});

// The global category taxonomy (shared across the whole app, same table
// services/pdf-service reads) — needed so the conversational agent can tell
// whether what the user describes actually fits an existing category before
// proposing a new one.
export async function getCategories(): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM categories ORDER BY sort_order ASC`;
  return rows.map((r) => r.name);
}

export interface PendingLoan {
  id: string;
  counterparty: string | null;
  amount: string;
}

// A reply to this exact message always wins, regardless of any other state
// (an active capture session, etc.) — it's an unambiguous, deliberate
// confirmation. Only outstanding/overdue loans are matched: once repaid, the
// same reminder message no longer refers to anything actionable.
export async function findLoanByReminderMessage(
  userId: string,
  messageId: number
): Promise<PendingLoan | null> {
  const [row] = await sql<PendingLoan[]>`
    SELECT id, counterparty, amount FROM loan_book
    WHERE user_id = ${userId}
      AND reminder_telegram_message_id = ${messageId}
      AND status IN ('outstanding', 'overdue')
  `;
  return row ?? null;
}

// The "next message counts as confirmation" half of the flow — deliberately
// only used when there's exactly one such loan (see webhook.ts): with more
// than one pending reminder for the same chat, an unaddressed message is
// ambiguous, and guessing wrong would wrongly mark the wrong loan repaid.
export async function findPendingReminderLoans(userId: string): Promise<PendingLoan[]> {
  return sql<PendingLoan[]>`
    SELECT id, counterparty, amount FROM loan_book
    WHERE user_id = ${userId}
      AND status IN ('outstanding', 'overdue')
      AND reminder_sent_at IS NOT NULL
  `;
}

export async function markLoanFulfilled(loanId: string): Promise<void> {
  await sql`UPDATE loan_book SET status = 'repaid', updated_at = now() WHERE id = ${loanId}`;
}

export interface UserGateStatus {
  isAdmin: boolean;
  // Decrypted, present only when the user has saved their own Anthropic key
  // (apps/api's /users/me/anthropic-key) — they're exempt from the Telegram
  // quota below, and this same key is forwarded to pdf-service so their
  // processing is billed to them instead of the app.
  ownApiKey: string | null;
}

export async function getUserGateStatus(userId: string): Promise<UserGateStatus> {
  const [row] = await sql<{ email: string; anthropicApiKey: Buffer | null }[]>`
    SELECT email, anthropic_api_key FROM users WHERE id = ${userId}
  `;
  return {
    isAdmin: row?.email === ADMIN_EMAIL,
    ownApiKey: row?.anthropicApiKey ? decryptBuffer(row.anthropicApiKey).toString("utf8") : null,
  };
}

// Only transactions logged through Telegram count toward the Telegram cap —
// bank-statement transactions are gated separately (by statement count, in
// apps/api) and shouldn't count against this limit.
export async function countTelegramTransactions(userId: string): Promise<number> {
  const [row] = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM transactions WHERE user_id = ${userId} AND source = 'telegram'
  `;
  return row?.count ?? 0;
}
