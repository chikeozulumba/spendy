import { Hono } from "hono";
import { sql } from "../db.js";
import { requireAuth } from "../auth.js";
import { encryptBuffer, decryptBuffer } from "../crypto.js";
import { isAdminEmail } from "../limits.js";

export const users = new Hono();
users.use("*", requireAuth);

const ANTHROPIC_KEY_PREFIX = "sk-ant-";

// A cheap, non-billed call (listing models costs no tokens) — just confirms
// the key is real and active before we accept it, rather than finding out
// the next time a statement fails to process.
async function isValidAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    return res.ok;
  } catch (err) {
    console.error("[users] Anthropic key validation request failed:", err);
    return false;
  }
}

// Shared by the statements route (to decide whether to bypass the quota and
// to forward the key to pdf-service) — one place decrypts it.
export async function getDecryptedAnthropicKey(userId: string): Promise<string | null> {
  const [row] = await sql<{ anthropicApiKey: Buffer | null }[]>`
    SELECT anthropic_api_key FROM users WHERE id = ${userId}
  `;
  if (!row?.anthropicApiKey) return null;
  return decryptBuffer(row.anthropicApiKey).toString("utf8");
}

users.get("/me", async (c) => {
  const userId = c.get("userId");
  const email = c.get("userEmail");
  const isAdmin = isAdminEmail(email);

  const [row] = await sql<{ hasKey: boolean }[]>`
    SELECT anthropic_api_key IS NOT NULL AS "hasKey" FROM users WHERE id = ${userId}
  `;
  const hasOwnApiKey = row?.hasKey ?? false;

  return c.json({
    email,
    isAdmin,
    hasOwnApiKey,
    // Non-admins can't process anything on the app's key — the web app uses
    // this to prompt for one as soon as they sign in.
    requiresApiKey: !isAdmin && !hasOwnApiKey,
  });
});

users.patch("/me/anthropic-key", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json().catch(() => null);
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey.startsWith(ANTHROPIC_KEY_PREFIX)) {
    return c.json(
      { error: "That doesn't look like an Anthropic API key (should start with sk-ant-)" },
      400
    );
  }

  const valid = await isValidAnthropicKey(apiKey);
  if (!valid) {
    return c.json({ error: "Anthropic rejected this key — double check it's correct and active" }, 400);
  }

  const encrypted = encryptBuffer(Buffer.from(apiKey, "utf8"));
  await sql`UPDATE users SET anthropic_api_key = ${encrypted} WHERE id = ${userId}`;

  return c.json({ ok: true });
});

users.delete("/me/anthropic-key", async (c) => {
  const userId = c.get("userId");
  await sql`UPDATE users SET anthropic_api_key = NULL WHERE id = ${userId}`;
  return c.json({ ok: true });
});
