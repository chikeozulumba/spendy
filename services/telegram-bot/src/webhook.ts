import { sql } from "./db.js";
import { downloadFile, sendMessage, type TelegramUpdate } from "./telegram.js";
import { putEncrypted, storagePathFor } from "./storage.js";
import { nextConversationTurn } from "./llm.js";
import { appendTurn, createSession, deleteSession, getSession } from "./session.js";
import { logAbandonedSession } from "./sessionLog.js";
import { handleStart } from "./linking.js";
import { enqueueTelegramJob } from "./queue.js";

async function findLinkedUserId(chatId: string): Promise<string | null> {
  const [row] = await sql<{ id: string }[]>`SELECT id FROM users WHERE telegram_chat_id = ${chatId}`;
  return row?.id ?? null;
}

async function handleNewDocument(
  chatId: string,
  userId: string,
  fileId: string,
  mimeType: string
): Promise<void> {
  const existing = await getSession(chatId);
  if (existing) {
    await sendMessage(
      chatId,
      "You already have a document in progress — finish that conversation first, or send /cancel to start over."
    );
    return;
  }

  const bytes = await downloadFile(fileId);
  const extension = mimeType.includes("pdf") ? "pdf" : "jpg";
  const storagePath = storagePathFor(chatId, `receipt.${extension}`);
  await putEncrypted(storagePath, bytes, mimeType);

  await createSession({ userId, chatId, storagePath, mimeType });

  const { message, ready } = await nextConversationTurn([]);
  await appendTurn(chatId, { role: "agent", message, ts: new Date().toISOString() }, ready);
  await sendMessage(chatId, message);
}

async function handleCancel(chatId: string): Promise<void> {
  const session = await getSession(chatId);
  if (!session) {
    await sendMessage(chatId, "No active session to cancel.");
    return;
  }
  await logAbandonedSession(session);
  await deleteSession(chatId);
  await sendMessage(chatId, "Session cancelled — nothing was logged. Send a new document any time.");
}

async function handleConversationText(chatId: string, text: string): Promise<void> {
  const session = await getSession(chatId);
  if (!session) {
    await sendMessage(chatId, "Send a photo or PDF of a receipt or payment to start logging something.");
    return;
  }

  const isDone = text.trim().toLowerCase() === "done";

  if (isDone && session.readyToEnd) {
    // Section 6.4 condition 1 — the only path that produces a transaction.
    const withUserTurn = await appendTurn(
      chatId,
      { role: "user", message: text, ts: new Date().toISOString() },
      session.readyToEnd
    );
    if (!withUserTurn) return;

    const result = await enqueueTelegramJob({
      userId: withUserTurn.userId,
      chatId,
      storagePath: withUserTurn.storagePath,
      mimeType: withUserTurn.mimeType,
      transcript: withUserTurn.turns,
    });
    await deleteSession(chatId);

    // On success, the processing service sends its own summary message once
    // it knows what was actually logged (Section 6.5 step 6) — it has the
    // extracted amount/category/loan details this service never sees.
    if (!result.ok) {
      await sendMessage(
        chatId,
        `Something went wrong logging that: ${result.error ?? "unknown error"}. Your document is still saved — try /cancel and resend it, or contact support.`
      );
    }
    return;
  }

  const withUserTurn = await appendTurn(
    chatId,
    { role: "user", message: text, ts: new Date().toISOString() },
    session.readyToEnd
  );
  if (!withUserTurn) return;

  const { message, ready } = await nextConversationTurn(withUserTurn.turns);
  await appendTurn(chatId, { role: "agent", message, ts: new Date().toISOString() }, ready);
  await sendMessage(chatId, message);
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
    await sendMessage(
      chatId,
      "Link your Spendy account first — generate a code from the dashboard and send /start <code> here."
    );
    return;
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
    await handleNewDocument(chatId, userId, fileId, mimeType);
    return;
  }

  if (text) {
    await handleConversationText(chatId, text);
  }
}
