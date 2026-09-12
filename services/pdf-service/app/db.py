import datetime as dt

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
) -> None:
    period_start = _to_date(period_start)
    period_end = _to_date(period_end)
    pool = await get_pool()
    if currency is None:
        await pool.execute(
            """
            UPDATE statements
            SET opening_balance = $2, closing_balance = $3,
                statement_period_start = $4, statement_period_end = $5,
                updated_at = now()
            WHERE id = $1
            """,
            statement_id,
            opening_balance,
            closing_balance,
            period_start,
            period_end,
        )
    else:
        await pool.execute(
            """
            UPDATE statements
            SET opening_balance = $2, closing_balance = $3,
                statement_period_start = $4, statement_period_end = $5,
                currency = $6, updated_at = now()
            WHERE id = $1
            """,
            statement_id,
            opening_balance,
            closing_balance,
            period_start,
            period_end,
            currency,
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


async def get_categories() -> list[str]:
    pool = await get_pool()
    rows = await pool.fetch("SELECT name FROM categories ORDER BY sort_order ASC")
    return [r["name"] for r in rows]


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
