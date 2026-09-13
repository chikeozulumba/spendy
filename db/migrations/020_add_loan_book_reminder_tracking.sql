-- Tracks the most recent due/overdue reminder sent for a loan, so:
--  1) the due-date sweep only ever sends the on-the-day reminder once
--     (reminder_sent_at IS NULL is the "hasn't been reminded yet" gate), and
--  2) services/telegram-bot can recognize a reply to that exact Telegram
--     message (reply_to_message.message_id) as the user confirming the loan
--     was repaid, without needing a separate table just for that mapping.
ALTER TABLE loan_book ADD COLUMN reminder_sent_at TIMESTAMPTZ;
ALTER TABLE loan_book ADD COLUMN reminder_telegram_message_id BIGINT;
