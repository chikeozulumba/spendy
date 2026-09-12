import re

from . import db
from .llm import categorize_transactions

_DIGITS = re.compile(r"\d+")
_NON_ALNUM = re.compile(r"[^a-z0-9\s]")
_WHITESPACE = re.compile(r"\s+")


def normalize_merchant(description: str) -> str:
    """Mirrors apps/api/src/lib/merchant.ts::normalizeMerchant — keep the two
    in sync if this logic changes."""
    text = description.lower()
    text = _DIGITS.sub("", text)
    text = _NON_ALNUM.sub(" ", text)
    text = _WHITESPACE.sub(" ", text)
    return text.strip()


async def categorize_all(user_id: str, transactions: list[dict]) -> None:
    """`transactions` is a list of {id, description} dicts (already persisted
    rows). Resolves category via user override, then global cache, then a
    single batched LLM call for whatever's left; writes results back."""
    taxonomy = await db.get_categories()

    uncached: list[dict] = []
    merchant_by_tx_id: dict[str, str] = {}

    for tx in transactions:
        merchant = normalize_merchant(tx["description"])
        merchant_by_tx_id[tx["id"]] = merchant

        override = await db.get_user_override(user_id, merchant)
        if override:
            await db.set_transaction_category(tx["id"], override, 1.0)
            continue

        cached = await db.get_cached_category(merchant)
        if cached:
            await db.set_transaction_category(tx["id"], cached, 0.9)
            continue

        uncached.append({"id": tx["id"], "description": tx["description"]})

    if not uncached:
        return

    results = categorize_transactions(
        [{"transaction_id": t["id"], "description": t["description"]} for t in uncached],
        taxonomy,
    )

    valid_categories = set(taxonomy)
    for result in results:
        tx_id = result.get("transaction_id")
        category = result.get("category")
        confidence = float(result.get("confidence", 0.5))
        if tx_id is None or category not in valid_categories:
            continue

        await db.set_transaction_category(tx_id, category, confidence)

        if confidence >= 0.75:
            merchant = merchant_by_tx_id.get(tx_id)
            if merchant:
                await db.upsert_merchant_cache(merchant, category)
