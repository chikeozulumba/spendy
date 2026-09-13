import { sql } from "./db.js";
import { sendMessage } from "./telegram.js";

// Handles "/start <token>" (Section 6.1). A token is valid only once, only
// before it expires, and only redeemed from a chat not already linked to a
// *different* account — each of these is checked explicitly rather than
// relying on a single query to implicitly reject bad states.
export async function handleStart(chatId: string, token: string | undefined): Promise<void> {
  if (!token) {
    await sendMessage(
      chatId,
      "Send /start followed by the linking code from your Spendy dashboard, e.g. /start abc123."
    );
    return;
  }

  const [tokenRow] = await sql<{ id: string; userId: string }[]>`
    SELECT id, user_id FROM telegram_link_tokens
    WHERE token = ${token} AND used_at IS NULL AND expires_at > now()
  `;
  if (!tokenRow) {
    await sendMessage(
      chatId,
      "That link code is invalid or has expired. Generate a new one from the Spendy dashboard and try again."
    );
    return;
  }

  const [existingOwner] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE telegram_chat_id = ${chatId} AND id != ${tokenRow.userId}
  `;
  if (existingOwner) {
    await sendMessage(
      chatId,
      "This Telegram chat is already linked to a different Spendy account. Unlink it from the dashboard first."
    );
    return;
  }

  await sql.begin(async (trx) => {
    await trx`UPDATE users SET telegram_chat_id = ${chatId} WHERE id = ${tokenRow.userId}`;
    await trx`UPDATE telegram_link_tokens SET used_at = now() WHERE id = ${tokenRow.id}`;
  });

  await sendMessage(
    chatId,
    "You're linked! Send a photo or PDF of a receipt, cash payment, or transfer any time and I'll help you log it."
  );
}
