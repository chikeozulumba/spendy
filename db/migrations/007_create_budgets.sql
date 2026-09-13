-- A target spend amount for one scope over one period. Periods default to a
-- calendar month in the UI but are stored as an explicit date range so a
-- custom range (a quarter, a trip, a one-off event) works the same way.
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  scope_id UUID NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_id, period_start, period_end)
);

CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_start, period_end);
