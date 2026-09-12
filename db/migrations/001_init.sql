-- Bank Statement Spending Analyzer — initial schema

CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk user id
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO categories (name, sort_order) VALUES
  ('Food & Groceries', 1),
  ('Transport', 2),
  ('Rent/Housing', 3),
  ('Utilities', 4),
  ('Subscriptions', 5),
  ('Entertainment', 6),
  ('Shopping', 7),
  ('Health', 8),
  ('Income', 9),
  ('Transfers', 10),
  ('Fees/Charges', 11),
  ('Other', 12);

CREATE TABLE statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  original_filename TEXT NOT NULL,
  storage_path TEXT, -- nulled out once the raw PDF is purged by retention cleanup
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'done', 'failed')),
  failure_reason TEXT,
  opening_balance NUMERIC(14, 2),
  closing_balance NUMERIC(14, 2),
  statement_period_start DATE,
  statement_period_end DATE,
  reconciliation_ok BOOLEAN,
  reconciliation_note TEXT,
  summary TEXT, -- plain-language monthly summary, generated once during processing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_statements_user_id ON statements(user_id);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  category TEXT,
  category_confidence NUMERIC(4, 3),
  is_user_overridden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_statement_id ON transactions(statement_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);

CREATE TABLE category_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  merchant_pattern TEXT NOT NULL, -- normalized merchant string
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, merchant_pattern)
);

CREATE TABLE merchant_category_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_pattern TEXT NOT NULL UNIQUE, -- normalized, global cache (not per-user)
  category TEXT NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_statement_id ON jobs(statement_id);
