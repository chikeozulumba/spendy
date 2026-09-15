import datetime as dt
import logging
import time

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import db
from .categorize import categorize_all
from .config import settings
from .contacts import resolve_entities_for_transactions
from .llm import LlmJsonError, extract_transactions, generate_summary
from .pdf_extract import PdfPasswordError, decrypt_if_needed, extract_text
from .reconcile import check_reconciliation
from .redact import redact_account_numbers
from .storage import fetch_decrypted_pdf
from .telegram_processing import router as telegram_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("pdf-service")

app = FastAPI(title="spendy-pdf-service")
app.include_router(telegram_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs every request's outcome, and — critically — catches anything an
    endpoint raises that isn't already handled locally (a bug, a dependency
    import error, an unhandled exception in a code path outside /process's own
    try/except) so it shows up as a 500 with a real traceback in the deploy
    logs instead of the connection just dropping with nothing recorded."""
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"ok": False, "error": "Internal server error"})
    ms = (time.monotonic() - start) * 1000
    log = logger.warning if response.status_code >= 400 else logger.info
    log("%s %s -> %d (%.0fms)", request.method, request.url.path, response.status_code, ms)
    return response


@app.on_event("startup")
async def log_startup_config():
    # Non-secret config only — confirms the deployed service is actually
    # wired to the endpoint/bucket/port everyone expects, without ever
    # printing a credential.
    logger.info(
        "pdf-service starting: port=%s storage_endpoint=%s storage_bucket=%s retention_days=%s",
        settings.port,
        settings.storage_endpoint,
        settings.storage_bucket,
        settings.retention_days,
    )


class ProcessRequest(BaseModel):
    statementId: str
    password: str | None = None
    # The user's own Anthropic key, present only when they've opted out of
    # the shared processing quota — see `password`'s comment below, same
    # request-scoped-only handling applies.
    anthropicApiKey: str | None = None


class ProcessResponse(BaseModel):
    ok: bool
    error: str | None = None


def _check_internal_token(x_internal_token: str | None) -> None:
    if x_internal_token != settings.internal_service_token:
        # A mismatch here (INTERNAL_SERVICE_TOKEN differs between the api and
        # pdf-service deployments) makes every single statement fail with no
        # other symptom — this is the first thing to check in the logs.
        logger.warning("Rejected /process request: internal token mismatch")
        raise HTTPException(status_code=403, detail="Forbidden")


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/process", response_model=ProcessResponse)
async def process(req: ProcessRequest, x_internal_token: str | None = Header(default=None)):
    _check_internal_token(x_internal_token)

    logger.info("statement=%s /process request received", req.statementId)

    statement = await db.fetch_statement(req.statementId)
    if statement is None:
        # Seen in production if the api triggers processing before its own
        # insert is actually visible to this service's DB connection, or if
        # the statement was deleted mid-flight — either way, worth knowing
        # this happened rather than a silent 404.
        logger.error("statement=%s not found in DB when /process was called", req.statementId)
        raise HTTPException(status_code=404, detail="Statement not found")

    statement_id = str(statement["id"])
    user_id = statement["user_id"]
    storage_path = statement["storage_path"]
    logger.info("statement=%s user=%s starting pipeline", statement_id, user_id)

    # `req.password` and `req.anthropicApiKey` are used only in the local
    # variables below for this one request's lifetime — neither is ever
    # written to any log line or DB row.
    try:
        if not storage_path:
            raise RuntimeError("Original PDF was purged by retention policy; re-upload required")

        logger.info("statement=%s fetching+decrypting PDF from %s", statement_id, storage_path)
        encrypted_at_rest_plaintext = fetch_decrypted_pdf(storage_path)
        try:
            plain_pdf = decrypt_if_needed(encrypted_at_rest_plaintext, req.password)
        except PdfPasswordError as exc:
            logger.warning("statement=%s password-protected PDF: %s", statement_id, exc)
            await db.update_statement_status(statement_id, "failed", str(exc))
            return ProcessResponse(ok=False, error=str(exc))

        raw_text = extract_text(plain_pdf)
        logger.info("statement=%s extracted %d chars of text from PDF", statement_id, len(raw_text))
        if not raw_text.strip():
            raise RuntimeError("No extractable text found in PDF (scanned/image PDFs are not supported)")

        redacted_text = redact_account_numbers(raw_text)

        logger.info("statement=%s calling LLM for transaction extraction", statement_id)
        try:
            extraction = extract_transactions(redacted_text, api_key=req.anthropicApiKey)
        except LlmJsonError as exc:
            raise RuntimeError(f"LLM extraction failed: {exc}") from exc

        raw_transactions = extraction.get("transactions")
        if not isinstance(raw_transactions, list):
            raise RuntimeError("LLM extraction response missing 'transactions' list")
        logger.info("statement=%s LLM extraction returned %d raw transaction(s)", statement_id, len(raw_transactions))

        parsed_transactions = _validate_transactions(raw_transactions)
        logger.info(
            "statement=%s %d of %d transaction(s) passed validation",
            statement_id,
            len(parsed_transactions),
            len(raw_transactions),
        )
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
        logger.info("statement=%s reconciliation ok=%s note=%s", statement_id, ok, note)
        await db.update_statement_reconciliation(statement_id, ok, note)

        tx_ids = await db.insert_transactions(statement_id, user_id, parsed_transactions)
        logger.info("statement=%s inserted %d transaction row(s)", statement_id, len(tx_ids))
        tx_for_categorization = [
            {"id": tx_id, "description": row["description"]}
            for tx_id, row in zip(tx_ids, parsed_transactions)
        ]

        logger.info("statement=%s calling LLM for categorization", statement_id)
        await categorize_all(user_id, tx_for_categorization, api_key=req.anthropicApiKey)

        logger.info("statement=%s resolving contacts/entities", statement_id)
        await resolve_entities_for_transactions(user_id, tx_for_categorization, api_key=req.anthropicApiKey)

        current_totals = await db.get_statement_category_totals(statement_id)
        before_date = _parse_date(period_end) or dt.date.today()
        prior_totals = await db.get_prior_month_category_totals(user_id, before_date)
        logger.info("statement=%s generating summary", statement_id)
        summary = generate_summary(current_totals, prior_totals, api_key=req.anthropicApiKey)
        await db.update_statement_summary(statement_id, summary)

        await db.update_statement_status(statement_id, "done")
        logger.info("statement=%s pipeline complete: done", statement_id)
        return ProcessResponse(ok=True)

    except Exception as exc:  # noqa: BLE001 - top-level pipeline guard
        logger.exception("statement=%s processing failed: %s", statement_id, exc)
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
