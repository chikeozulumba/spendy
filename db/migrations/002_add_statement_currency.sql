-- Statements are extracted in whatever currency the source PDF actually uses
-- (inferred by the LLM during processing), not assumed to be USD. Default is
-- 'USD' only as a safe fallback for rows created before extraction runs (or,
-- for existing rows, before this column existed).
ALTER TABLE statements ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
