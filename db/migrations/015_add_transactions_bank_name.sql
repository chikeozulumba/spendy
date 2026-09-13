-- Bank/institution for a transaction that has no parent statement to inherit
-- one from (a Telegram capture) — e.g. "GTBank" for a transfer, or left null
-- for a genuinely cash payment. Bank-statement-sourced transactions keep
-- relying on statements.bank_name via the existing join; this column is only
-- ever populated for source = 'telegram' rows.
ALTER TABLE transactions ADD COLUMN bank_name TEXT;
