"""Reminds a user, on the day a tracked loan is due, to go collect it — the
Telegram message doubles as the prompt for the reply-to-confirm flow
(services/telegram-bot/src/webhook.ts matches a reply against
reminder_telegram_message_id), and a matching row is written to
`notifications` so the same reminder shows up in the web app to be marked
read. Run daily (e.g. as a Railway cron job), ideally earlier in the day than
loan_overdue_job.py: `python -m app.loan_due_reminder_job`.
"""

import asyncio
import logging

from . import db
from .telegram_client import send_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loan-due-reminder-job")


async def run() -> None:
    rows = await db.due_today_loan_candidates()
    logger.info("Found %d loan(s) due today", len(rows))
    for row in rows:
        loan_id = str(row["id"])
        user_id = row["user_id"]
        who = row["counterparty"] or "someone"
        amount = row["amount"]
        try:
            title = "Loan due today"
            body = f"The loan of {amount:,.2f} to {who} is due today — time to collect it."
            await db.create_notification(user_id, "loan_due", title, body, loan_id)

            chat_id = row["telegram_chat_id"]
            if chat_id:
                message_id = await send_message(
                    chat_id,
                    f"{body} Reply to this message (or just send your next message) once "
                    "they've paid you back and I'll mark it as repaid.",
                )
                await db.mark_loan_reminder_sent(loan_id, message_id)
            else:
                # No linked Telegram chat to remind or later match a reply
                # against — the in-app notification above still covers it.
                await db.mark_loan_reminder_sent(loan_id, None)

            logger.info("Sent due-date reminder for loan %s", loan_id)
        except Exception:
            logger.exception("Failed to process due-today loan %s", loan_id)


if __name__ == "__main__":
    asyncio.run(run())
