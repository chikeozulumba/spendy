import postgres from "postgres";
import { env } from "./env.js";

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
