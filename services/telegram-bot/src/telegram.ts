import { env } from "./env.js";

const API_BASE = `https://api.telegram.org/bot${env.telegramBotToken}`;
const FILE_BASE = `https://api.telegram.org/file/bot${env.telegramBotToken}`;

export async function sendMessage(chatId: string, text: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
  }
}

interface TelegramFile {
  file_id: string;
  file_path?: string;
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) throw new Error(`Telegram getFile failed (${res.status})`);
  const { result } = (await res.json()) as { result: TelegramFile };
  if (!result.file_path) throw new Error("Telegram getFile returned no file_path");

  const fileRes = await fetch(`${FILE_BASE}/${result.file_path}`);
  if (!fileRes.ok) throw new Error(`Telegram file download failed (${fileRes.status})`);
  return Buffer.from(await fileRes.arrayBuffer());
}

// Telegram's webhook payload shape, narrowed to the fields this bot reads.
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    chat: { id: number; type: string };
    from?: { id: number };
    text?: string;
    document?: { file_id: string; file_name?: string; mime_type?: string };
    photo?: { file_id: string; file_size?: number }[];
    // The caption attached to a photo/document upload (Telegram shows it as
    // text under the file) — fed into the session as the opening turn so it
    // informs categorization from the start, not just later Q&A answers.
    caption?: string;
    // Present when the user replies to a specific earlier message — used to
    // recognize a reply to a loan due/overdue reminder as a repayment
    // confirmation (see webhook.ts).
    reply_to_message?: { message_id: number };
  };
}
