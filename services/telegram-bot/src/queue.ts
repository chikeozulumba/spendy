import { sql } from "./db.js";
import { env } from "./env.js";
import type { SessionTurn } from "./session.js";

interface ProcessResult {
  ok: boolean;
  error?: string;
}

// Mirrors apps/api/src/lib/internalClient.ts's triggerProcessing(): insert a
// durable job row (the "Postgres-backed queue table" from Section 4), then
// call the processing service directly rather than have it poll — same
// push-based shape as the existing statement pipeline, just with a
// telegram_jobs row standing in for the bank-statement `jobs` table.
export async function enqueueTelegramJob(input: {
  userId: string;
  chatId: string;
  storagePath: string;
  mimeType: string;
  transcript: SessionTurn[];
}): Promise<ProcessResult> {
  const [job] = await sql<{ id: string }[]>`
    INSERT INTO telegram_jobs (user_id, chat_id, storage_path, mime_type, transcript, status)
    VALUES (${input.userId}, ${input.chatId}, ${input.storagePath}, ${input.mimeType}, ${sql.json(
      // postgres.js's JSONValue type requires each object's index signature
      // to structurally be JSONValue-shaped, which a plain SessionTurn[]
      // interface array never satisfies even though every field is itself
      // JSON-safe — round-tripping through JSON.parse/stringify sidesteps
      // that type-checker quirk rather than fighting it with casts.
      JSON.parse(JSON.stringify(input.transcript))
    )}, 'pending')
    RETURNING id
  `;
  if (!job) throw new Error("Failed to create telegram_jobs row");

  await sql`UPDATE telegram_jobs SET status = 'running', attempts = attempts + 1 WHERE id = ${job.id}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.pdfServiceTimeoutMs);

  try {
    const res = await fetch(`${env.pdfServiceUrl}/telegram/process`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": env.internalServiceToken,
      },
      body: JSON.stringify({ jobId: job.id }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const error = `pdf-service returned ${res.status}: ${body}`;
      await sql`UPDATE telegram_jobs SET status = 'failed', last_error = ${error} WHERE id = ${job.id}`;
      return { ok: false, error };
    }

    const data = (await res.json()) as ProcessResult;
    await sql`
      UPDATE telegram_jobs SET status = ${data.ok ? "succeeded" : "failed"}, last_error = ${data.error ?? null}
      WHERE id = ${job.id}
    `;
    return data;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await sql`UPDATE telegram_jobs SET status = 'failed', last_error = ${error} WHERE id = ${job.id}`;
    return { ok: false, error };
  } finally {
    clearTimeout(timeout);
  }
}
