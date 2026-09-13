-- Durable record written once a Telegram conversation session ends (Section
-- 6.4/6.5) — the audit trail. Live session state during the conversation
-- lives only in Redis (ephemeral, TTL-bound) and is never itself persisted
-- here; this row is written exactly once, at the end, from whichever end
-- condition fired.
CREATE TABLE telegram_sessions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  chat_id TEXT NOT NULL,
  storage_path TEXT, -- null for an abandoned session where nothing was ever uploaded to R2... though in practice a session only exists once a document is uploaded
  conversation_transcript JSONB NOT NULL DEFAULT '[]',
  resulting_transaction_id UUID REFERENCES transactions(id),
  status TEXT NOT NULL CHECK (status IN ('completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_sessions_log_user_id ON telegram_sessions_log(user_id);
