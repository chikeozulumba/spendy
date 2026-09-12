import datetime as dt
import logging

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

from . import db
from .categorize import categorize_all
from .config import settings
from .llm import LlmJsonError, extract_transactions, generate_summary
from .pdf_extract import PdfPasswordError, decrypt_if_needed, extract_text
from .reconcile import check_reconciliation
from .redact import redact_account_numbers
from .storage import fetch_decrypted_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdf-service")

app = FastAPI(title="spendy-pdf-service")


class ProcessRequest(BaseModel):
    statementId: str
    password: str | None = None


class ProcessResponse(BaseModel):
    ok: bool
    error: str | None = None


def _check_internal_token(x_internal_token: str | None) -> None:
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/process", response_model=ProcessResponse)
async def process(req: ProcessRequest, x_internal_token: str | None = Header(default=None)):
    _check_internal_token(x_internal_token)

    statement = await db.fetch_statement(req.statementId)
    if statement is None:
        raise HTTPException(status_code=404, detail="Statement not found")

    statement_id = str(statement["id"])
    user_id = statement["user_id"]
    storage_path = statement["storage_path"]

    # `req.password` is used only in the local variables below for this one
    # request's lifetime — it is never written to any log line or DB row.
    try:
        if not storage_path:
            raise RuntimeError("Original PDF was purged by retention policy; re-upload required")

        encrypted_at_rest_plaintext = fetch_decrypted_pdf(storage_path)
        try:
            plain_pdf = decrypt_if_needed(encrypted_at_rest_plaintext, req.password)
        except PdfPasswordError as exc:
            await db.update_statement_status(statement_id, "failed", str(exc))
            return ProcessResponse(ok=False, error=str(exc))

        raw_text = extract_text(plain_pdf)
        if not raw_text.strip():
            raise RuntimeError("No extractable text found in PDF (scanned/image PDFs are not supported)")

        redacted_text = redact_account_numbers(raw_text)

        try:
            extraction = extract_transactions(redacted_text)
        except LlmJsonError as exc:
            raise RuntimeError(f"LLM extraction failed: {exc}") from exc

        raw_transactions = extraction.get("transactions")
        if not isinstance(raw_transactions, list):
            raise RuntimeError("LLM extraction response missing 'transactions' list")

        parsed_transactions = _validate_transactions(raw_transactions)
        opening_balance = _as_float_or_none(extraction.get("opening_balance"))
        closing_balance = _as_float_or_none(extraction.get("closing_balance"))
        period_start = extraction.get("period_start")
        period_end = extraction.get("period_end")
        currency = _as_currency_or_none(extraction.get("currency"))
        bank_name = _as_bank_name_or_none(extraction.get("bank_name"))

        await db.update_statement_extraction(
            statement_id,
            opening_balance,
            closing_balance,
            period_start,
            period_end,
            currency,
            bank_name,
        )

        ok, note = check_reconciliation(parsed_transactions, opening_balance, closing_balance)
        await db.update_statement_reconciliation(statement_id, ok, note)

        tx_ids = await db.insert_transactions(statement_id, user_id, parsed_transactions)
        tx_for_categorization = [
            {"id": tx_id, "description": row["description"]}
            for tx_id, row in zip(tx_ids, parsed_transactions)
        ]
        await categorize_all(user_id, tx_for_categorization)

        current_totals = await db.get_statement_category_totals(statement_id)
        before_date = _parse_date(period_end) or dt.date.today()
        prior_totals = await db.get_prior_month_category_totals(user_id, before_date)
        summary = generate_summary(current_totals, prior_totals)
        await db.update_statement_summary(statement_id, summary)

        await db.update_statement_status(statement_id, "done")
        return ProcessResponse(ok=True)

    except Exception as exc:  # noqa: BLE001 - top-level pipeline guard
        logger.exception("Processing failed for statement %s", statement_id)
        await db.update_statement_status(statement_id, "failed", str(exc))
        return ProcessResponse(ok=False, error=str(exc))


def _validate_transactions(raw: list) -> list[dict]:
    parsed = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        date = item.get("date")
        description = item.get("description")
        amount = item.get("amount")
        direction = item.get("direction")
        if not (date and description and isinstance(amount, (int, float)) and direction in ("debit", "credit")):
            continue
        parsed.append({"date": date, "description": description, "amount": abs(float(amount)), "direction": direction})
    if not parsed:
        raise RuntimeError("No valid transactions parsed from statement")
    return parsed


def _as_currency_or_none(value) -> str | None:
    """Only trust a well-formed ISO 4217-shaped code (3 ASCII letters). Anything
    else — null, a stray symbol, a hallucinated non-code — is treated as "not
    identified" and left to the DB column's existing/default value rather than
    writing something bogus."""
    if isinstance(value, str) and len(value) == 3 and value.isalpha() and value.isascii():
        return value.upper()
    return None


def _as_bank_name_or_none(value) -> str | None:
    if isinstance(value, str) and (name := value.strip()):
        return name[:200]  # matches the practical width a bank name should ever need
    return None


def _as_float_or_none(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _parse_date(value) -> dt.date | None:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value)
    except (ValueError, TypeError):
        return None
