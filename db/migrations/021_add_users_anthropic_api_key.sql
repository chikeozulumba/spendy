-- A user can supply their own Anthropic API key to bypass the app's usage
-- caps (MAX_STATEMENTS_PER_USER, MAX_TELEGRAM_TRANSACTIONS_PER_USER) since
-- their processing is then billed to their own key instead of the app's.
-- Stored encrypted at rest (same AES-256-GCM scheme as encrypted PDFs);
-- NULL means "no key on file, subject to normal quotas".
ALTER TABLE users ADD COLUMN anthropic_api_key BYTEA;
