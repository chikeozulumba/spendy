import { sql } from "./db.js";
import type { Session } from "./session.js";

// The completed-session case is logged by the processing service (it's the
// one that knows the resulting transaction id) — this is only ever called
// for the two abandoned paths (Section 6.4: inactivity timeout, /cancel).
export async function logAbandonedSession(session: Session): Promise<void> {
  await sql`
    INSERT INTO telegram_sessions_log
      (user_id, chat_id, storage_path, conversation_transcript, status, created_at, ended_at)
    VALUES
      (${session.userId}, ${session.chatId}, ${session.storagePath}, ${sql.json(
        JSON.parse(JSON.stringify(session.turns))
      )},
       'abandoned', ${session.startedAt}, now())
  `;
}
