"""Deletes raw PDF blobs (not the extracted transaction data) for statements
that finished processing more than RETENTION_DAYS ago. Run periodically
(e.g. as a Railway cron job): `python -m app.retention_cleanup`.
"""

import asyncio
import logging

from . import db
from .config import settings
from .storage import delete_object

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("retention-cleanup")


async def run() -> None:
    rows = await db.statements_older_than(settings.retention_days)
    logger.info("Found %d statement(s) eligible for PDF purge", len(rows))
    for row in rows:
        statement_id = str(row["id"])
        storage_path = row["storage_path"]
        try:
            delete_object(storage_path)
            await db.clear_storage_path(statement_id)
            logger.info("Purged raw PDF for statement %s", statement_id)
        except Exception:
            logger.exception("Failed to purge statement %s", statement_id)

    # Section 9/G2: Telegram documents/receipts get the same retention
    # policy as bank statement PDFs — same RETENTION_DAYS setting, same
    # "delete the blob, keep the already-extracted data" shape.
    telegram_rows = await db.telegram_sessions_older_than(settings.retention_days)
    logger.info("Found %d telegram session(s) eligible for document purge", len(telegram_rows))
    for row in telegram_rows:
        session_log_id = str(row["id"])
        storage_path = row["storage_path"]
        try:
            delete_object(storage_path)
            await db.clear_telegram_storage_path(session_log_id)
            logger.info("Purged telegram document for session log %s", session_log_id)
        except Exception:
            logger.exception("Failed to purge telegram session log %s", session_log_id)


if __name__ == "__main__":
    asyncio.run(run())
