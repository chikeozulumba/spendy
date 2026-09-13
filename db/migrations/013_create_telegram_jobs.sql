-- Postgres-backed queue between the Telegram Bot service and the processing
-- service (Section 4's "MVP simplicity" queue option) — the bot service
-- inserts a row when a session ends via explicit `done`, then calls the
-- processing service directly (mirroring how `jobs` + triggerProcessing()
-- already works for the bank-statement pipeline); this table is the durable
-- record/status trail of that handoff, not a polled work queue.
CREATE TABLE telegram_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  chat_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  transcript JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_jobs_chat_id ON telegram_jobs(chat_id);
