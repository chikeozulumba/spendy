-- Tracks a loan identified during a Telegram session that the user expects
-- back (Section 6.6). `counterparty` is free text the user typed about
-- someone else — treated as unverified user-provided data, never as an
-- identity the app itself has any relationship with (Section 9).
CREATE TABLE loan_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  counterparty TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  expected_repayment_date DATE,
  status TEXT NOT NULL DEFAULT 'outstanding'
    CHECK (status IN ('outstanding', 'repaid', 'overdue', 'written_off')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_book_user_id ON loan_book(user_id);
-- Powers the daily overdue sweep (Section 6.6): only outstanding loans with a
-- known repayment date are ever candidates to flip to overdue.
CREATE INDEX idx_loan_book_overdue_check ON loan_book(expected_repayment_date)
  WHERE status = 'outstanding';
