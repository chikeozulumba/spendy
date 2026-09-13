import base64
import json
import re

import anthropic

from .config import settings

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
_MODEL = "claude-sonnet-5"


class LlmJsonError(Exception):
    pass


_FENCE_OPEN_RE = re.compile(r"^```(?:json)?\s*", re.IGNORECASE)
_FENCE_CLOSE_RE = re.compile(r"\s*```\s*$")


def _extract_json_block(text: str) -> str:
    """Claude is asked to return JSON only, but strip code fences defensively
    in case it wraps the response anyway. Also handles a fence left
    unterminated by a truncated (max_tokens) response, where the closing ```
    never arrives — otherwise the leading ```json is left in and json.loads
    fails immediately at position 0, which reads exactly like an empty
    response and makes truncation indistinguishable from malformed JSON."""
    match = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", text, re.DOTALL)
    if match:
        return match.group(1)
    stripped = text.strip()
    stripped = _FENCE_OPEN_RE.sub("", stripped)
    stripped = _FENCE_CLOSE_RE.sub("", stripped)
    return stripped


def _call_json(system: str, user: str, *, max_tokens: int = 4096) -> dict:
    last_error: Exception | None = None
    for attempt in range(2):  # one retry on malformed JSON
        response = _client.messages.create(
            model=_MODEL,
            max_tokens=max_tokens,
            system=system,
            # Disable extended thinking: for a long/complex statement, Sonnet 5's
            # default-on reasoning can silently consume the entire max_tokens
            # budget before emitting any answer text at all (response.content
            # ends up with only a "thinking" block, zero "text" blocks). That's
            # indistinguishable from an empty response once joined below, and
            # this is a deterministic extraction/categorization task that
            # doesn't benefit from it anyway.
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": user}],
        )

        if response.stop_reason == "max_tokens":
            # The response was cut off mid-output — whatever text we have is
            # incomplete by definition. Retrying with the same budget against
            # the same input would almost certainly truncate at the same
            # point, so fail clearly instead of masquerading as bad JSON.
            last_error = RuntimeError(
                f"response was truncated at the {max_tokens}-token limit before completing"
            )
            break

        raw = "".join(block.text for block in response.content if block.type == "text")
        try:
            return json.loads(_extract_json_block(raw))
        except json.JSONDecodeError as exc:
            last_error = exc
            user = (
                user
                + "\n\nYour previous response was not valid JSON and could not be parsed. "
                "Respond again with ONLY valid JSON, no commentary, no markdown fences."
            )
    raise LlmJsonError(f"LLM did not return valid JSON after retry: {last_error}")


def _call_json_multimodal(system: str, content: list[dict], *, max_tokens: int = 4096) -> dict:
    """Same contract as _call_json, but for a request that includes a
    document/image content block alongside text — used only by the Telegram
    capture's structuring call, where the document itself (not
    pre-extracted text) is part of the input."""
    last_error: Exception | None = None
    for attempt in range(2):
        if attempt > 0:
            content = content + [
                {
                    "type": "text",
                    "text": "Your previous response was not valid JSON and could not be "
                    "parsed. Respond again with ONLY valid JSON, no commentary, no markdown fences.",
                }
            ]

        response = _client.messages.create(
            model=_MODEL,
            max_tokens=max_tokens,
            system=system,
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": content}],
        )

        if response.stop_reason == "max_tokens":
            last_error = RuntimeError(
                f"response was truncated at the {max_tokens}-token limit before completing"
            )
            break

        raw = "".join(block.text for block in response.content if block.type == "text")
        try:
            return json.loads(_extract_json_block(raw))
        except json.JSONDecodeError as exc:
            last_error = exc
    raise LlmJsonError(f"LLM did not return valid JSON after retry: {last_error}")


TELEGRAM_CAPTURE_SYSTEM_PROMPT = """You are a financial data extraction system for
Spendy's Trends feature: a user sent a photo or PDF of a receipt/payment/transfer
via Telegram, then had a short conversation clarifying what it was for. You are
given both the document and the full conversation transcript.

Treat the document as the source of truth for the amount/date/merchant when it's
a legible formal receipt or transfer confirmation. For an informal document (e.g.
a blurry cash handoff photo, or a screenshot with no clear amount), treat the
conversation transcript as the primary source of truth instead — the user may have
stated the amount/purpose in words rather than it being legible in the image.

Categorize into ONE of these existing categories (verbatim) when it genuinely fits: {taxonomy}

The conversation transcript may show the assistant proposing a brand new
category (because nothing existing fit) and the user confirming it — if so,
use that confirmed new category name for "category" and set
"is_new_category" to true. Only do this when the transcript shows the user
actually agreed to a specific new category name; if the conversation never
raised this, categorize into one of the existing categories above as normal.

Return ONLY strict JSON, no commentary, no markdown fences, matching:
{{
  "amount": <positive number>,
  "date": "<YYYY-MM-DD, your best determination from the document or conversation, or today's date if genuinely neither indicates one>",
  "description": "<short merchant/purpose description>",
  "direction": "debit" | "credit",
  "category": "<one of the existing categories above, or the new one confirmed in conversation>",
  "is_new_category": <true only if "category" is a brand new one confirmed in conversation, else false>,
  "bank_name": "<bank/institution this went through, e.g. from a transfer confirmation or what the user said, or null if genuinely cash/not applicable>",
  "entity_name": "<the actual person, business, or place this money went to/came from, or null if genuinely not identifiable>",
  "entity_type": "person" | "business" | "place" | "other" | "unknown" | null,
  "is_loan": <true | false>,
  "loan_counterparty": "<name mentioned in conversation, or null if not a loan or not stated>",
  "loan_expected_repayment_date": "<YYYY-MM-DD if a repayment date was stated, else null>"
}}

Rules:
- "is_loan" is true only if the conversation clearly states this is money lent
  out that the user expects back (or, if received, an informal loan they took
  and must repay). An ordinary purchase or gift is not a loan.
- Never invent a loan_expected_repayment_date that wasn't actually stated —
  null is a valid, expected answer for "no date given".
- "amount" must be a positive number regardless of direction.
- "bank_name" should be null for a plain cash payment — don't guess a bank
  just because a payment happened; only set it when a bank/institution is
  actually legible on the document or was stated in conversation.
- "entity_name" is who/what the money actually went to or came from (a
  merchant, a named person, a landlord) — not the bank/rail it went through.
  If this is a loan, "entity_name" should match "loan_counterparty" (they're
  the same person). Use null rather than guessing when the conversation and
  document genuinely don't identify a counterparty.
"""


def structure_telegram_capture(
    transcript: list[dict], document_bytes: bytes, mime_type: str, taxonomy: list[str]
) -> dict:
    encoded = base64.b64encode(document_bytes).decode("ascii")
    block_type = "document" if mime_type == "application/pdf" else "image"

    transcript_text = "\n".join(
        f"{'User' if turn.get('role') == 'user' else 'Assistant'}: {turn.get('message', '')}"
        for turn in transcript
    )

    content = [
        {"type": block_type, "source": {"type": "base64", "media_type": mime_type, "data": encoded}},
        {"type": "text", "text": f"Conversation transcript:\n{transcript_text}"},
    ]

    system = TELEGRAM_CAPTURE_SYSTEM_PROMPT.format(taxonomy=", ".join(taxonomy))
    return _call_json_multimodal(system, content, max_tokens=1024)


EXTRACTION_SYSTEM_PROMPT = """You are a precise financial data extraction system.
You will be given raw text extracted from a bank statement PDF (may include page
markers like "--- page 2 ---" and some [REDACTED] tokens where account numbers
were stripped — ignore those, they are not transactions).

Extract every individual transaction line. Return ONLY strict JSON matching this
shape, with no commentary and no markdown code fences:

{
  "currency": "<ISO 4217 code, e.g. USD/EUR/GBP, or null>",
  "bank_name": "<the bank/financial institution's name, or null>",
  "opening_balance": <number or null>,
  "closing_balance": <number or null>,
  "period_start": "<YYYY-MM-DD or null>",
  "period_end": "<YYYY-MM-DD or null>",
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "...", "amount": <positive number>, "direction": "debit" | "credit"}
  ]
}

Rules:
- "amount" is always a positive number; use "direction" to indicate debit (money out) vs credit (money in).
- Preserve every transaction across page breaks; do not drop or duplicate rows that straddle a page marker.
- If a balance or date isn't identifiable from the text, use null rather than guessing.
- Do not invent transactions that aren't present in the text.
- Infer "currency" from symbols (e.g. "$", "€", "£", "₦"), an explicit code
  (e.g. "NGN"), a currency name in words (e.g. "Naira"), or other wording on
  the statement (e.g. a bank name/address implying a country's currency).
  Use null only if truly nothing on the statement suggests one — don't
  default to USD just because it's common.
- Some statements (e.g. many Nigerian bank exports) print amounts with a
  bare "N" instead of "₦" (a PDF font/encoding limitation, not a different
  currency) — e.g. "N15,000.00". Recognize this as Naira ("NGN") using
  context (bank name/address, "Naira"/"NGN" appearing elsewhere on the
  statement), not as part of the number itself.
- Infer "bank_name" from the statement's letterhead/logo text, header, or
  footer (e.g. "Chase", "Bank of America", "Access Bank"). Use the bank's own
  name as it appears, not a marketing tagline; use null if it truly isn't
  identifiable rather than guessing from context like currency or address
  alone.
"""


def extract_transactions(statement_text: str) -> dict:
    # 20000 is the largest budget the non-streaming client accepts (the SDK
    # requires streaming above ~24000, since a response could then plausibly
    # run past its 10-minute non-streaming timeout). A long statement with
    # many transactions needs real headroom here — 8192 was tight enough to
    # truncate on ordinary-sized statements.
    return _call_json(EXTRACTION_SYSTEM_PROMPT, statement_text, max_tokens=20000)


def categorization_system_prompt(taxonomy: list[str]) -> str:
    taxonomy_list = ", ".join(taxonomy)
    return f"""You are a transaction categorization system for a personal finance app.
You will be given a JSON list of transactions, each with an "id" and "description".

Categorize each transaction into EXACTLY ONE of these categories (use the name
verbatim, do not invent new categories): {taxonomy_list}.

Return ONLY strict JSON: a list of
{{"transaction_id": "...", "category": "<one of the categories above>", "confidence": <0.0-1.0>}}
one entry per input transaction, no commentary, no markdown fences.
"""


def categorize_transactions(items: list[dict], taxonomy: list[str]) -> list[dict]:
    # categorize_all() batches every uncached transaction from the statement
    # into this one call — same truncation risk as extraction on a statement
    # with many transactions, so the same higher budget applies here.
    user = json.dumps(items)
    result = _call_json(categorization_system_prompt(taxonomy), user, max_tokens=20000)
    if isinstance(result, dict) and "results" in result:
        return result["results"]
    if isinstance(result, list):
        return result
    raise LlmJsonError("Categorization response was not a list")


ENTITY_SYSTEM_PROMPT = """You are an entity-extraction system for a personal finance app.
You will be given a JSON list of bank transactions, each with an "id" and "description"
(raw text straight from a bank statement — often messy, e.g. "SQ *BLUE BOTTLE COFFEE",
"ZELLE TO JOHN SMITH", "AMZN Mktp US*A1B2C3", "CHEVRON 0123456 HOUSTON TX").

For each one, identify the actual person, business, or place the money flowed to/from,
if the description makes that identifiable at all.

Return ONLY strict JSON: a list of
{"transaction_id": "...", "entity_name": "<clean name, or null>", "entity_type": "person" | "business" | "place" | "other" | "unknown" | null}
one entry per input transaction, no commentary, no markdown fences.

Rules:
- Strip processor/POS noise (leading "SQ *", "TST*", trailing store numbers,
  city/state codes, card-network suffixes) down to the actual name — "SQ *BLUE
  BOTTLE COFFEE" becomes "Blue Bottle Coffee", not "SQ Blue Bottle Coffee".
- "ZELLE TO JOHN SMITH" / "person-to-person" style transfers name the actual
  person, type "person" — not "Zelle" itself (that's the rail, not the entity).
- A generic, non-identifying description ("ATM WITHDRAWAL", "INTEREST
  PAYMENT", "MONTHLY MAINTENANCE FEE", "TRANSFER FROM SAVINGS") has no real
  counterparty — return "entity_name": null, "entity_type": null for those
  rather than inventing one.
- Use "business" for companies/merchants, "place" only for a physical
  location that isn't itself a business (e.g. a toll plaza, a city transit
  system), "person" for an individual's name, "other" for anything real but
  not fitting those (a government agency, a nonprofit).
"""


def extract_entities(items: list[dict]) -> list[dict]:
    """items: [{"id": ..., "description": ...}, ...] — same batching shape
    and truncation-budget reasoning as categorize_transactions."""
    user = json.dumps(items)
    result = _call_json(ENTITY_SYSTEM_PROMPT, user, max_tokens=20000)
    if isinstance(result, dict) and "results" in result:
        return result["results"]
    if isinstance(result, list):
        return result
    raise LlmJsonError("Entity extraction response was not a list")


SUMMARY_SYSTEM_PROMPT = """You write short, plain-language monthly spending summaries
for a personal finance dashboard. You will be given already-aggregated category
totals for the current statement and, if available, the prior 30 days for
comparison. Write 2-4 sentences, plain language, no bullet points, mentioning the
biggest spending category/categories and any notable change vs. the prior period
if that data is provided. Do not mention raw transaction counts or technical
terms like "debit"/"credit". Return plain text only, no JSON, no markdown."""


def generate_summary(current_totals: dict[str, float], prior_totals: dict[str, float]) -> str:
    user = json.dumps({"current_period": current_totals, "prior_period": prior_totals})
    response = _client.messages.create(
        model=_MODEL,
        max_tokens=300,
        system=SUMMARY_SYSTEM_PROMPT,
        # Same reasoning as _call_json: with a 300-token budget, default-on
        # extended thinking could plausibly consume it all and leave no
        # summary text — not an exception here, just a silently blank summary.
        thinking={"type": "disabled"},
        messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in response.content if block.type == "text").strip()
