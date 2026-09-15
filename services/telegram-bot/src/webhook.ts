import {
  sql,
  getCategories,
  findLoanByReminderMessage,
  findPendingReminderLoans,
  markLoanFulfilled,
  isAdminUser,
  countTelegramTransactions,
  type PendingLoan,
} from "./db.js";
import { MAX_TELEGRAM_TRANSACTIONS_PER_USER } from "./limits.js";
import { downloadFile, sendMessage, type TelegramUpdate } from "./telegram.js";
import { putEncrypted, storagePathFor } from "./storage.js";
import { nextConversationTurn } from "./llm.js";
import { appendTurn, createSession, deleteSession, getSession, type Session } from "./session.js";
import { logAbandonedSession } from "./sessionLog.js";
import { handleStart } from "./linking.js";
import { enqueueTelegramJob } from "./queue.js";

async function findLinkedUserId(chatId: string): Promise<string | null> {
  const [row] = await sql<{ id: string }[]>`SELECT id FROM users WHERE telegram_chat_id = ${chatId}`;
  return row?.id ?? null;
}

// A failed *notification* (blocked chat, transient Telegram API error, ...)
// must never block the actual data-processing it's reporting on — logging a
// transaction or cancelling a session both need to complete regardless of
// whether the user ends up seeing a message about it.
async function trySendMessage(chatId: string, text: string): Promise<void> {
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.error(`Failed to send Telegram message to chat ${chatId}:`, err);
  }
}

// The only path that produces a transaction — triggered the moment the
// conversational agent itself signals "ready" (or the user explicitly types
// "done" as a manual override), no separate confirmation step required.
async function finalizeSession(session: Session): Promise<void> {
  const result = await enqueueTelegramJob({
    userId: session.userId,
    chatId: session.chatId,
    storagePath: session.storagePath,
    mimeType: session.mimeType,
    transcript: session.turns,
  });
  await deleteSession(session.chatId);

  // On success, the processing service sends its own summary message once it
  // knows what was actually logged — it has the extracted amount/category/
  // loan details this service never sees.
  if (!result.ok) {
    await trySendMessage(
      session.chatId,
      `Something went wrong logging that: ${result.error ?? "unknown error"}. Your document is still saved — try /cancel and resend it, or contact support.`
    );
  }
}

async function handleNewDocument(
  chatId: string,
  userId: string,
  fileId: string,
  mimeType: string,
  caption?: string
): Promise<void> {
  const existing = await getSession(chatId);
  if (existing) {
    await trySendMessage(
      chatId,
      "You already have a document in progress — finish that conversation first, or send /cancel to start over."
    );
    return;
  }

  // Non-admin accounts are capped on transactions logged via Telegram —
  // checked before downloading the file or starting a capture session.
  if (!(await isAdminUser(userId))) {
    const count = await countTelegramTransactions(userId);
    if (count >= MAX_TELEGRAM_TRANSACTIONS_PER_USER) {
      await trySendMessage(
        chatId,
        `You've reached the limit of ${MAX_TELEGRAM_TRANSACTIONS_PER_USER} transactions logged via Telegram for this account.`
      );
      return;
    }
  }

  const bytes = await downloadFile(fileId);
  const extension = mimeType.includes("pdf") ? "pdf" : "jpg";
  const storagePath = storagePathFor(chatId, `receipt.${extension}`);
  await putEncrypted(storagePath, bytes, mimeType);

  let session = await createSession({ userId, chatId, storagePath, mimeType });

  // A caption sent alongside the file ("gave this to Chidi, due back
  // Friday") is real information about what it is — seed it as the opening
  // turn so the first conversational question (or, if the caption already
  // covers everything, the finalize itself) accounts for it instead of
  // asking things the caption already answered.
  if (caption) {
    const withCaptionTurn = await appendTurn(
      chatId,
      { role: "user", message: caption, ts: new Date().toISOString() },
      false
    );
    if (withCaptionTurn) session = withCaptionTurn;
  }

  const taxonomy = await getCategories();
  const { message, ready } = await nextConversationTurn(session.turns, taxonomy);
  const withAgentTurn = await appendTurn(
    chatId,
    { role: "agent", message, ts: new Date().toISOString() },
    ready
  );
  // Finalize before the (best-effort) reply — a failed notification must
  // never be the reason a ready-to-log transaction doesn't get logged.
  if (ready && withAgentTurn) await finalizeSession(withAgentTurn);
  await trySendMessage(chatId, message);
}

async function confirmLoanFulfilled(chatId: string, loan: PendingLoan): Promise<void> {
  await markLoanFulfilled(loan.id);
  await trySendMessage(
    chatId,
    `Marked the loan of ${Number(loan.amount).toLocaleString()} to ${loan.counterparty ?? "them"} as repaid. Thanks for confirming!`
  );
}

async function handleCancel(chatId: string): Promise<void> {
  const session = await getSession(chatId);
  if (!session) {
    await trySendMessage(chatId, "No active session to cancel.");
    return;
  }
  await logAbandonedSession(session);
  await deleteSession(chatId);
  await trySendMessage(chatId, "Session cancelled — nothing was logged. Send a new document any time.");
}

async function handleConversationText(chatId: string, text: string): Promise<void> {
  const session = await getSession(chatId);
  if (!session) {
    await trySendMessage(chatId, "Send a photo or PDF of a receipt or payment to start logging something.");
    return;
  }

  // "done" isn't required to end a session anymore (the agent finalizes on
  // its own once it has enough), but it's kept as a manual override in case
  // the user wants to force it through early.
  if (text.trim().toLowerCase() === "done") {
    const withUserTurn = await appendTurn(
      chatId,
      { role: "user", message: text, ts: new Date().toISOString() },
      true
    );
    if (withUserTurn) await finalizeSession(withUserTurn);
    return;
  }

  const withUserTurn = await appendTurn(
    chatId,
    { role: "user", message: text, ts: new Date().toISOString() },
    session.readyToEnd
  );
  if (!withUserTurn) return;

  const taxonomy = await getCategories();
  const { message, ready } = await nextConversationTurn(withUserTurn.turns, taxonomy);
  const withAgentTurn = await appendTurn(
    chatId,
    { role: "agent", message, ts: new Date().toISOString() },
    ready
  );
  if (ready && withAgentTurn) await finalizeSession(withAgentTurn);
  await trySendMessage(chatId, message);
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message) return;

  const chatId = String(message.chat.id);
  const text = message.text?.trim();

  if (text?.startsWith("/start")) {
    const token = text.split(/\s+/)[1];
    await handleStart(chatId, token);
    return;
  }

  const userId = await findLinkedUserId(chatId);
  if (!userId) {
    await trySendMessage(
      chatId,
      "Link your Spendy account first — generate a code from the dashboard and send /start <code> here."
    );
    return;
  }

  // An explicit reply to a loan reminder always wins, ahead of anything else
  // going on (an active capture session included) — quoting a specific
  // message is a deliberate, unambiguous action.
  if (message.reply_to_message) {
    const loan = await findLoanByReminderMessage(userId, message.reply_to_message.message_id);
    if (loan) {
      await confirmLoanFulfilled(chatId, loan);
      return;
    }
  }

  if (text?.toLowerCase() === "/cancel") {
    await handleCancel(chatId);
    return;
  }

  const document = message.document;
  const photo = message.photo?.at(-1); // Telegram sends ascending sizes; the last is largest.
  if (document || photo) {
    const fileId = document?.file_id ?? photo!.file_id;
    const mimeType = document?.mime_type ?? "image/jpeg";
    await handleNewDocument(chatId, userId, fileId, mimeType, message.caption?.trim());
    return;
  }

  if (text) {
    // Not a reply, and not mid-capture: if there's exactly one loan
    // awaiting a reminder reply, treat this plain message as the "next
    // message" confirmation (Section: reply-or-next-message). With zero or
    // more than one pending loan this is ambiguous, so it falls through to
    // ordinary conversation handling instead of guessing.
    const activeSession = await getSession(chatId);
    if (!activeSession) {
      const pending = await findPendingReminderLoans(userId);
      if (pending.length === 1) {
        await confirmLoanFulfilled(chatId, pending[0]!);
        return;
      }
    }

    await handleConversationText(chatId, text);
  }
}
