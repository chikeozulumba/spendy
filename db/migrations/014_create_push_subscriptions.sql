-- Web Push subscriptions (one browser/device registration each) for
-- statement-processing notifications. A user can have several — one per
-- browser/device they've enabled notifications on — so this is keyed by the
-- subscription's own unique endpoint URL, not by user_id alone.
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
