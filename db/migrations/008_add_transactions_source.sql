-- Distinguishes transactions written by the core bank-statement pipeline from
-- ones captured via the Trends Telegram bot (cash payments, informal
-- transfers, loans the statement pipeline can never see). Existing rows all
-- came from a statement, hence the default.
ALTER TABLE transactions
  ADD COLUMN source TEXT NOT NULL DEFAULT 'bank_statement'
  CHECK (source IN ('bank_statement', 'telegram'));

-- transactions.statement_id is NOT NULL today (001_init.sql) because every
-- row came from a statement; a telegram-sourced row has no statement at all.
ALTER TABLE transactions ALTER COLUMN statement_id DROP NOT NULL;
