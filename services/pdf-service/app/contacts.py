"""Resolves an extracted entity name (a person/business/place a transaction
flowed to or from) into a `contacts` row, deduplicating per user by a
normalized form of the name so trivial variations of the same counterparty
("AMZN Mktp US" vs "Amazon.com", "chidi" vs "Chidi ") collapse into one
contact rather than fragmenting."""

import logging
import re

from . import db
from .llm import LlmJsonError, extract_entities

logger = logging.getLogger("pdf-service.contacts")

_NON_ALNUM = re.compile(r"[^a-z0-9\s]")
_WHITESPACE = re.compile(r"\s+")

VALID_TYPES = {"person", "business", "place", "other", "unknown"}


def normalize_name(name: str) -> str:
    text = name.lower().strip()
    text = _NON_ALNUM.sub(" ", text)
    text = _WHITESPACE.sub(" ", text)
    return text.strip()


async def upsert_contact(user_id: str, name: str | None, entity_type: str | None) -> str | None:
    """Returns the contact's id, or None if `name` isn't usable (blank, or
    normalizes to nothing — e.g. a name that was just punctuation)."""
    if not name or not (normalized := normalize_name(name)):
        return None
    resolved_type = entity_type if entity_type in VALID_TYPES else "unknown"
    return await db.upsert_contact(user_id, name.strip(), normalized, resolved_type)


async def resolve_entities_for_transactions(user_id: str, items: list[dict]) -> None:
    """items: [{"id": ..., "description": ...}, ...] — the same shape
    categorize_all() already builds from a statement's freshly-inserted rows.
    Best-effort: a failure here shouldn't fail statement processing overall,
    since categorization/reconciliation are the actually load-bearing steps."""
    if not items:
        return
    try:
        results = extract_entities(items)
    except LlmJsonError:
        logger.exception("Entity extraction failed for %d transaction(s)", len(items))
        return

    for result in results:
        tx_id = result.get("transaction_id")
        entity_name = result.get("entity_name")
        entity_type = result.get("entity_type")
        if not tx_id or not entity_name:
            continue
        contact_id = await upsert_contact(user_id, entity_name, entity_type)
        if contact_id:
            await db.set_transaction_contact(tx_id, contact_id)
