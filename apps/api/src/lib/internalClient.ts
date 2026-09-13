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
  const url = `${env.pdfServiceUrl}/process`;

  console.log(`[pdf-service] POST ${url} statementId=${statementId}`);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": env.internalServiceToken,
      },
      body: JSON.stringify({ statementId, password }),
      signal: controller.signal,
    });

    const ms = Date.now() - start;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[pdf-service] statementId=${statementId} returned ${res.status} after ${ms}ms: ${body}`
      );
      return { ok: false, error: `pdf-service returned ${res.status}: ${body}` };
    }
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error(`[pdf-service] statementId=${statementId} reported failure after ${ms}ms: ${data.error}`);
    } else {
      console.log(`[pdf-service] statementId=${statementId} succeeded after ${ms}ms`);
    }
    return data;
  } catch (err) {
    const ms = Date.now() - start;
    // Most commonly this is the AbortController firing (env.pdfServiceTimeoutMs
    // elapsed with no response) or the pdf-service host being unreachable
    // entirely (wrong PDF_SERVICE_URL, service down, DNS failure) — both look
    // identical to the caller otherwise, so the message here is what
    // distinguishes them.
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = isAbort
      ? `request to pdf-service timed out after ${ms}ms (limit ${env.pdfServiceTimeoutMs}ms)`
      : err instanceof Error
        ? err.message
        : String(err);
    console.error(`[pdf-service] statementId=${statementId} request failed after ${ms}ms:`, err);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
