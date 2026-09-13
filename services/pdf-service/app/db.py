import datetime as dt
import json

import asyncpg

from .config import settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
    return _pool


async def fetch_statement(statement_id: str) -> asyncpg.Record | None:
    pool = await get_pool()
    return await pool.fetchrow(
        "SELECT id, user_id, storage_path, original_filename FROM statements WHERE id = $1",
        statement_id,
    )


async def update_statement_status(statement_id: str, status: str, failure_reason: str | None = None) -> None:
    pool = await get_pool()
    await pool.execute(
        """
        UPDATE statements
        SET status = $2, failure_reason = $3, updated_at = now()
        WHERE id = $1
        """,
        statement_id,
        status,
        failure_reason,
    )


def _to_date(value) -> dt.date | None:
    if isinstance(value, str):
        try:
            return dt.date.fromisoformat(value)
        except ValueError:
            return None
    return value


async def update_statement_extraction(
    statement_id: str,
    opening_balance: float | None,
    closing_balance: float | None,
    period_start,
    period_end,
    currency: str | None = None,
    bank_name: str | None = None,
) -> None:
    period_start = _to_date(period_start)
    period_end = _to_date(period_end)
    pool = await get_pool()
    # currency/bank_name are inferred with lower confidence than the rest of
    # this row (the LLM may legitimately not identify either) — COALESCE onto
    # the existing value rather than branching per combination of "did we get
    # this field or not", which stops scaling the moment there's more than one
    # such optional field.
    #
    # bank_name specifically: COALESCE(bank_name, $7) — existing value first,
    # LLM guess only as a fallback. The user can pick their bank explicitly at
    # upload time now; that deliberate choice must never be silently
    # overwritten by a lower-confidence inference run afterward. currency has
    # no equivalent manual input yet, so it stays LLM-first.
    await pool.execute(
        """
        UPDATE statements
        SET opening_balance = $2, closing_balance = $3,
            statement_period_start = $4, statement_period_end = $5,
            currency = COALESCE($6, currency),
            bank_name = COALESCE(bank_name, $7),
            updated_at = now()
        WHERE id = $1
        """,
        statement_id,
        opening_balance,
        closing_balance,
        period_start,
        period_end,
        currency,
        bank_name,
    )


async def update_statement_reconciliation(statement_id: str, ok: bool, note: str | None) -> None:
    pool = await get_pool()
    await pool.execute(
        "UPDATE statements SET reconciliation_ok = $2, reconciliation_note = $3 WHERE id = $1",
        statement_id,
        ok,
        note,
    )


async def update_statement_summary(statement_id: str, summary: str) -> None:
    pool = await get_pool()
    await pool.execute("UPDATE statements SET summary = $2 WHERE id = $1", statement_id, summary)


async def insert_transactions(statement_id: str, user_id: str, rows: list[dict]) -> list[str]:
    """Inserts transactions (category fields left null; filled in by categorization
    step) and returns their generated ids in the same order as `rows`."""
    pool = await get_pool()
    ids: list[str] = []
    async with pool.acquire() as conn:
        async with conn.transaction():
            for row in rows:
                row_date = row["date"]
                if isinstance(row_date, str):
                    row_date = dt.date.fromisoformat(row_date)
                record = await conn.fetchrow(
                    """
                    INSERT INTO transactions (statement_id, user_id, date, description, amount, direction)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                    """,
                    statement_id,
                    user_id,
                    row_date,
                    row["description"],
                    row["amount"],
                    row["direction"],
                )
                ids.append(str(record["id"]))
    return ids


async def set_transaction_category(transaction_id: str, category: str, confidence: float) -> None:
    pool = await get_pool()
    await pool.execute(
        "UPDATE transactions SET category = $2, category_confidence = $3 WHERE id = $1",
        transaction_id,
        category,
        confidence,
    )


async def upsert_contact(user_id: str, name: str, normalized_name: str, entity_type: str) -> str:
    pool = await get_pool()
    record = await pool.fetchrow(
        """
        INSERT INTO contacts (user_id, name, normalized_name, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, normalized_name) DO UPDATE SET
          -- A contact seen again with a more specific type upgrades from
          -- 'unknown' — but never overwrites an already-confident type with
          -- a less certain one from a later, more ambiguous mention.
          type = CASE WHEN contacts.type = 'unknown' THEN EXCLUDED.type ELSE contacts.type END,
          updated_at = now()
        RETURNING id
        """,
        user_id,
        name,
        normalized_name,
        entity_type,
    )
    return str(record["id"])


async def set_transaction_contact(transaction_id: str, contact_id: str) -> None:
    pool = await get_pool()
    await pool.execute("UPDATE transactions SET contact_id = $2 WHERE id = $1", transaction_id, contact_id)


async def get_categories() -> list[str]:
    pool = await get_pool()
    rows = await pool.fetch("SELECT name FROM categories ORDER BY sort_order ASC")
    return [r["name"] for r in rows]


async def create_category(name: str) -> None:
    """Adds a brand new category the user confirmed creating during a
    Telegram capture (Section: 'give the option to create a new category').
    Global, same as every existing category — appended after whatever the
    current highest sort_order is. Idempotent: a category name that already
    exists (e.g. a race with another concurrent capture) is left as-is."""
    pool = await get_pool()
    await pool.execute(
        """
        INSERT INTO categories (name, sort_order)
        SELECT $1, COALESCE(MAX(sort_order), 0) + 1 FROM categories
        ON CONFLICT (name) DO NOTHING
        """,
        name,
    )


async def get_user_override(user_id: str, merchant_pattern: str) -> str | None:
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT category FROM category_overrides WHERE user_id = $1 AND merchant_pattern = $2",
        user_id,
        merchant_pattern,
    )
    return row["category"] if row else None


async def get_cached_category(merchant_pattern: str) -> str | None:
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT category FROM merchant_category_cache WHERE merchant_pattern = $1",
        merchant_pattern,
    )
    return row["category"] if row else None


async def upsert_merchant_cache(merchant_pattern: str, category: str) -> None:
    pool = await get_pool()
    await pool.execute(
        """
        INSERT INTO merchant_category_cache (merchant_pattern, category, hit_count)
        VALUES ($1, $2, 1)
        ON CONFLICT (merchant_pattern)
        DO UPDATE SET category = EXCLUDED.category, hit_count = merchant_category_cache.hit_count + 1,
                      updated_at = now()
        """,
        merchant_pattern,
        category,
    )


async def get_statement_category_totals(statement_id: str) -> dict[str, float]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE statement_id = $1 AND direction = 'debit'
        GROUP BY category
        """,
        statement_id,
    )
    return {r["category"]: float(r["total"]) for r in rows if r["category"]}


async def get_prior_month_category_totals(user_id: str, before_date) -> dict[str, float]:
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE user_id = $1 AND direction = 'debit' AND date < $2
          AND date >= ($2::date - INTERVAL '30 days')
        GROUP BY category
        """,
        user_id,
        before_date,
    )
    return {r["category"]: float(r["total"]) for r in rows if r["category"]}


async def statements_older_than(days: int) -> list[asyncpg.Record]:
    pool = await get_pool()
    return await pool.fetch(
        """
        SELECT id, storage_path FROM statements
        WHERE status = 'done' AND storage_path IS NOT NULL
          AND created_at < now() - ($1 || ' days')::interval
        """,
        str(days),
    )


async def clear_storage_path(statement_id: str) -> None:
    pool = await get_pool()
    await pool.execute("UPDATE statements SET storage_path = NULL WHERE id = $1", statement_id)


async def fetch_telegram_job(job_id: str) -> asyncpg.Record | None:
    pool = await get_pool()
    return await pool.fetchrow(
        """
        SELECT id, user_id, chat_id, storage_path, mime_type, transcript
        FROM telegram_jobs WHERE id = $1
        """,
        job_id,
    )


async def insert_telegram_transaction(
    user_id: str,
    date,
    description: str,
    amount: float,
    direction: str,
    category: str,
    category_confidence: float,
    bank_name: str | None = None,
) -> str:
    date = _to_date(date)
    pool = await get_pool()
    record = await pool.fetchrow(
        """
        INSERT INTO transactions
          (statement_id, user_id, date, description, amount, direction, category, category_confidence, source, bank_name)
        VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, 'telegram', $8)
        RETURNING id
        """,
        user_id,
        date,
        description,
        amount,
        direction,
        category,
        category_confidence,
        bank_name,
    )
    return str(record["id"])


async def insert_loan_book(
    user_id: str,
    transaction_id: str,
    counterparty: str | None,
    amount: float,
    expected_repayment_date,
) -> str:
    expected_repayment_date = _to_date(expected_repayment_date)
    pool = await get_pool()
    record = await pool.fetchrow(
        """
        INSERT INTO loan_book (user_id, transaction_id, counterparty, amount, expected_repayment_date, status)
        VALUES ($1, $2, $3, $4, $5, 'outstanding')
        RETURNING id
        """,
        user_id,
        transaction_id,
        counterparty,
        amount,
        expected_repayment_date,
    )
    return str(record["id"])


async def insert_telegram_session_log(
    user_id: str,
    chat_id: str,
    storage_path: str,
    transcript: list,
    resulting_transaction_id: str | None,
) -> None:
    pool = await get_pool()
    await pool.execute(
        """
        INSERT INTO telegram_sessions_log
          (user_id, chat_id, storage_path, conversation_transcript, resulting_transaction_id, status)
        VALUES ($1, $2, $3, $4::jsonb, $5, 'completed')
        """,
        user_id,
        chat_id,
        storage_path,
        json.dumps(transcript),
        resulting_transaction_id,
    )


async def telegram_sessions_older_than(days: int) -> list[asyncpg.Record]:
    pool = await get_pool()
    return await pool.fetch(
        """
        SELECT id, storage_path FROM telegram_sessions_log
        WHERE storage_path IS NOT NULL
          AND created_at < now() - ($1 || ' days')::interval
        """,
        str(days),
    )


async def clear_telegram_storage_path(session_log_id: str) -> None:
    pool = await get_pool()
    await pool.execute(
        "UPDATE telegram_sessions_log SET storage_path = NULL WHERE id = $1", session_log_id
    )


async def overdue_loan_candidates() -> list[asyncpg.Record]:
    """Outstanding loans past their expected repayment date, joined with the
    borrower's Telegram chat id (may be null if they've since unlinked)."""
    pool = await get_pool()
    return await pool.fetch(
        """
        SELECT l.id, l.counterparty, l.amount, l.expected_repayment_date, u.telegram_chat_id
        FROM loan_book l
        JOIN users u ON u.id = l.user_id
        WHERE l.status = 'outstanding' AND l.expected_repayment_date < CURRENT_DATE
        """
    )


async def mark_loan_overdue(loan_id: str) -> None:
    pool = await get_pool()
    await pool.execute(
        "UPDATE loan_book SET status = 'overdue', updated_at = now() WHERE id = $1", loan_id
    )
