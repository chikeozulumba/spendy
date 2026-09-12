-- Inferred from the statement PDF itself (letterhead/logo text, address,
-- statement title) during processing. Nullable: not every statement makes
-- this identifiable, and we don't want to guess.
ALTER TABLE statements ADD COLUMN bank_name TEXT;
