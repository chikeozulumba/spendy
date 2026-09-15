// The admin account is exempt from every usage cap below — everyone else is
// capped so a single account can't run up unbounded LLM/processing costs.
// Kept in sync with apps/api/src/limits.ts (no shared package between the
// two services to import it from).
export const ADMIN_EMAIL = "chike@toid.xyz";

export const MAX_TELEGRAM_TRANSACTIONS_PER_USER = 10;
