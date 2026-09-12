import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// Deliberately does not import ./env.js or ./db.js: this script only needs
// DATABASE_URL and shouldn't fail just because unrelated env vars (Clerk,
// storage, etc.) aren't set in whatever shell runs migrations.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing required env var: DATABASE_URL");
const sql = postgres(databaseUrl);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../../db/migrations");

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set(
    (await sql`SELECT filename FROM schema_migrations`).map((r) => r.filename as string)
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`Applying migration: ${file}`);
    const contents = await readFile(path.join(migrationsDir, file), "utf-8");
    await sql.unsafe(contents);
    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
  }

  console.log("Migrations up to date.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
