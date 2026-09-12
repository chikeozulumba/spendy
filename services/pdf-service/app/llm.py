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


EXTRACTION_SYSTEM_PROMPT = """You are a precise financial data extraction system.
You will be given raw text extracted from a bank statement PDF (may include page
markers like "--- page 2 ---" and some [REDACTED] tokens where account numbers
were stripped — ignore those, they are not transactions).

Extract every individual transaction line. Return ONLY strict JSON matching this
shape, with no commentary and no markdown code fences:

{
  "currency": "<ISO 4217 code, e.g. USD/EUR/GBP, or null>",
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
- Infer "currency" from symbols (e.g. "$", "€", "£"), an explicit code, or other
  wording on the statement (e.g. a bank name/address implying a country's
  currency). Use null only if truly nothing on the statement suggests one —
  don't default to USD just because it's common.
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
