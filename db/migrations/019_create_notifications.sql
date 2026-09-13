-- In-app notification center: surfaces alerts (starting with loan due-date
-- reminders) that were already sent via Telegram, so the user also sees them
-- next time they open the web app and can mark them read. `type` is left as
-- a free-form string rather than an enum — this is meant to be a general
-- notification feed other alert kinds can post into later, not something
-- scoped to loans specifically.
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  loan_id UUID REFERENCES loan_book(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_loan_id ON notifications(loan_id);
