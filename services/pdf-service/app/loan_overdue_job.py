"""Flags outstanding loans past their expected repayment date as overdue and
sends a Telegram reminder (Section 6.6). Run daily (e.g. as a Railway cron
job), after loan_due_reminder_job.py: `python -m app.loan_overdue_job`.
"""

import asyncio
import logging

from . import db
from .telegram_client import send_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loan-overdue-job")


async def run() -> None:
    rows = await db.overdue_loan_candidates()
    logger.info("Found %d loan(s) newly overdue", len(rows))
    for row in rows:
        loan_id = str(row["id"])
        user_id = row["user_id"]
        who = row["counterparty"] or "someone"
        try:
            await db.mark_loan_overdue(loan_id)

            title = "Loan overdue"
            body = (
                f"The loan of {row['amount']:,.2f} to {who} was expected back on "
                f"{row['expected_repayment_date']} and is now overdue."
            )
            await db.create_notification(user_id, "loan_overdue", title, body, loan_id)

            chat_id = row["telegram_chat_id"]
            if chat_id:
                message_id = await send_message(
                    chat_id,
                    f"Reminder: {body} Review it in your Spendy dashboard, or reply to this "
                    "message (or just send your next message) once they've paid you back.",
                )
                # Overwrites whatever the due-date reminder recorded — this is
                # now the most recent outstanding reminder, so a reply should
                # be matched against this message going forward.
                await db.mark_loan_reminder_sent(loan_id, message_id)
            logger.info("Marked loan %s overdue", loan_id)
        except Exception:
            logger.exception("Failed to process overdue loan %s", loan_id)


if __name__ == "__main__":
    asyncio.run(run())
