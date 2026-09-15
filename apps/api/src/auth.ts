import type { Context, Next } from "hono";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "./env.js";
import { sql } from "./db.js";

const clerkClient = createClerkClient({ secretKey: env.clerkSecretKey });

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return c.json({ error: "Missing bearer token" }, 401);

  let userId: string;
  try {
    const claims = await verifyToken(token, { secretKey: env.clerkSecretKey });
    userId = claims.sub;
  } catch (err) {
    // A wrong/rotated CLERK_SECRET_KEY in production, or clock skew, shows up
    // as every request failing auth with no other symptom — log the reason
    // (never the token itself) so that's diagnosable from the deploy logs.
    console.error("[auth] Token verification failed:", err instanceof Error ? err.message : err);
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  // Ensure a local `users` row exists (idempotent), so every FK reference in
  // statements/transactions/etc. is always satisfiable.
  let email: string;
  try {
    email = await resolveEmail(userId);
    await sql`
      INSERT INTO users (id, email) VALUES (${userId}, ${email})
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (err) {
    console.error(`[auth] Failed to upsert local user row for ${userId}:`, err);
    return c.json({ error: "Failed to establish user session" }, 500);
  }

  c.set("userId", userId);
  c.set("userEmail", email);
  await next();
}

async function resolveEmail(userId: string): Promise<string> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? `${userId}@unknown.local`;
  } catch (err) {
    console.error(`[auth] Failed to resolve Clerk email for ${userId}, using placeholder:`, err);
    return `${userId}@unknown.local`;
  }
}

export function requireInternalToken(c: Context, next: Next) {
  const token = c.req.header("x-internal-token");
  if (token !== env.internalServiceToken) {
    return c.json({ error: "Forbidden" }, 403);
  }
  return next();
}
