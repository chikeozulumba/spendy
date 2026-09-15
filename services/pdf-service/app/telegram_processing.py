import json
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from . import db
from .config import settings
from .contacts import upsert_contact
from .llm import LlmJsonError, structure_telegram_capture
from .storage import fetch_decrypted_pdf
from .telegram_client import send_message

logger = logging.getLogger("pdf-service.telegram")

router = APIRouter()


class TelegramProcessRequest(BaseModel):
    jobId: str
    # The user's own Anthropic key, present only when they've opted out of
    # the shared processing quota — request-scoped only, never persisted.
    anthropicApiKey: str | None = None


class TelegramProcessResponse(BaseModel):
    ok: bool
    error: str | None = None


def _check_internal_token(x_internal_token: str | None) -> None:
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/telegram/process", response_model=TelegramProcessResponse)
async def process_telegram_session(
    req: TelegramProcessRequest, x_internal_token: str | None = Header(default=None)
):
    _check_internal_token(x_internal_token)

    job = await db.fetch_telegram_job(req.jobId)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    user_id = job["user_id"]
    chat_id = job["chat_id"]
    storage_path = job["storage_path"]
    mime_type = job["mime_type"]
    transcript = json.loads(job["transcript"]) if isinstance(job["transcript"], str) else job["transcript"]

    try:
        document_bytes = fetch_decrypted_pdf(storage_path)  # generic decrypt+fetch, name is historical
        taxonomy = await db.get_categories()

        try:
            result = structure_telegram_capture(
                transcript, document_bytes, mime_type, taxonomy, api_key=req.anthropicApiKey
            )
        except LlmJsonError as exc:
            raise RuntimeError(f"LLM structuring failed: {exc}") from exc

        amount = _as_positive_float(result.get("amount"))
        date = result.get("date")
        description = _as_nonempty_str(result.get("description")) or "Telegram capture"
        direction = result.get("direction")
        category = result.get("category")
        is_new_category = bool(result.get("is_new_category"))
        bank_name = _as_nonempty_str(result.get("bank_name"))
        entity_name = _as_nonempty_str(result.get("entity_name"))
        entity_type = result.get("entity_type")
        is_loan = bool(result.get("is_loan"))
        loan_counterparty = _as_nonempty_str(result.get("loan_counterparty"))
        loan_repayment_date = result.get("loan_expected_repayment_date")

        if amount is None or not date or direction not in ("debit", "credit"):
            raise RuntimeError(
                f"Structuring response missing required fields: {result!r}"
            )

        if category not in taxonomy:
            if is_new_category and (new_name := _as_nonempty_str(category)):
                # The conversation already shows the user confirming this
                # exact name — the "option to create a new category" was
                # already given and accepted in chat, this just persists it.
                await db.create_category(new_name)
                category = new_name
            else:
                # The model named something outside the taxonomy without the
                # conversation actually confirming a new category — treat as
                # a miscategorization rather than silently inventing one.
                category = "Other"

        transaction_id = await db.insert_telegram_transaction(
            user_id, date, description, amount, direction, category, 0.8, bank_name
        )

        if is_loan:
            await db.insert_loan_book(user_id, transaction_id, loan_counterparty, amount, loan_repayment_date)

        contact_id = await upsert_contact(user_id, entity_name, entity_type)
        if contact_id:
            await db.set_transaction_contact(transaction_id, contact_id)

        await db.insert_telegram_session_log(user_id, chat_id, storage_path, transcript, transaction_id)

        bank_suffix = f" via {bank_name}" if bank_name else ""
        summary_lines = [f"Logged: {description} — {amount:,.2f} ({category}){bank_suffix}."]
        if is_loan:
            who = loan_counterparty or "them"
            when = f", expected back {loan_repayment_date}" if loan_repayment_date else ""
            summary_lines.append(f"Tracked as a loan to {who}{when}.")
        await send_message(chat_id, "\n".join(summary_lines))

        return TelegramProcessResponse(ok=True)

    except Exception as exc:  # noqa: BLE001 - top-level pipeline guard, mirrors main.py's /process
        logger.exception("Telegram processing failed for job %s", req.jobId)
        try:
            await send_message(
                chat_id, f"Sorry, I couldn't finish logging that: {exc}. Your document is still saved."
            )
        except Exception:  # noqa: BLE001 - don't let a failed notification mask the real error
            logger.exception("Also failed to notify chat %s of the processing error", chat_id)
        return TelegramProcessResponse(ok=False, error=str(exc))


def _as_positive_float(value) -> float | None:
    if isinstance(value, (int, float)):
        return abs(float(value))
    return None


def _as_nonempty_str(value) -> str | None:
    if isinstance(value, str) and (text := value.strip()):
        return text
    return None
