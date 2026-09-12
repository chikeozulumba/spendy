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


if __name__ == "__main__":
    asyncio.run(run())
