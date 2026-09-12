import { env } from "../env.js";

interface ProcessResult {
  ok: boolean;
  error?: string;
}

// Kicks off the full extraction/reconciliation/categorization pipeline in the
// pdf-service, synchronously from Hono's point of view (bounded timeout), but
// the caller in routes/statements.ts doesn't block the client response on it —
// see comment there. `password`, if present, lives only in this request body:
// it is never written to the `jobs` or `statements` rows.
export async function triggerProcessing(
  statementId: string,
  password: string | undefined
): Promise<ProcessResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.pdfServiceTimeoutMs);

  try {
    const res = await fetch(`${env.pdfServiceUrl}/process`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": env.internalServiceToken,
      },
      body: JSON.stringify({ statementId, password }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `pdf-service returned ${res.status}: ${body}` };
    }
    const data = (await res.json()) as { ok: boolean; error?: string };
    return data;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}
