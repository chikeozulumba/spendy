import postgres from "postgres";
import { env } from "./env.js";

export const sql = postgres(env.databaseUrl, {
  transform: postgres.camel,
});

// The global category taxonomy (shared across the whole app, same table
// services/pdf-service reads) — needed so the conversational agent can tell
// whether what the user describes actually fits an existing category before
// proposing a new one.
export async function getCategories(): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`SELECT name FROM categories ORDER BY sort_order ASC`;
  return rows.map((r) => r.name);
}
