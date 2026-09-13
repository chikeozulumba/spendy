-- Budget "scopes" — user-defined groupings for budgeting (e.g. Seed/Giving,
-- Education, Spending, Savings). Independent of the fixed `categories` table:
-- a scope is just a name the user picks, then maps one or more existing
-- transaction categories onto it (see scope_categories).
CREATE TABLE scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
