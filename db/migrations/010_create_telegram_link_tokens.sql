-- One-time tokens generated from the web app (POST /telegram/link-token) and
-- redeemed via "/start <token>" in Telegram (Section 6.1). Short-lived and
-- single-use by design: `used_at` is set on redemption and a used or expired
-- token is rejected, never re-checked against `expires_at` alone.
CREATE TABLE telegram_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_link_tokens_user_id ON telegram_link_tokens(user_id);
