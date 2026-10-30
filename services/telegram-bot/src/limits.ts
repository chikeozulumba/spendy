// Admin accounts process with the app's own ANTHROPIC_API_KEY (from the
// env). Everyone else must supply their own Anthropic key before anything is
// processed, so the app never pays for a non-admin's LLM usage.
//
// Kept in sync with apps/api/src/limits.ts (no shared package between the
// two services to import it from). ADMIN_EMAILS is a comma-separated list;
// DEFAULT_ADMIN_EMAIL is always an admin regardless of what it's set to.
const DEFAULT_ADMIN_EMAIL = "chike@toid.xyz";

const ADMIN_EMAILS = new Set(
  [DEFAULT_ADMIN_EMAIL, ...(process.env.ADMIN_EMAILS ?? "").split(",")]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase());
}
