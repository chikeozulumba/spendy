-- Set once the user completes /start <token> linking (Section 6.1). Nullable
-- (most users never link Telegram) and unique (one Telegram chat maps to at
-- most one Spendy account, and vice versa via the application-layer check on
-- link — a chat id already bound to another user should never silently
-- re-bind).
ALTER TABLE users ADD COLUMN telegram_chat_id TEXT UNIQUE;
