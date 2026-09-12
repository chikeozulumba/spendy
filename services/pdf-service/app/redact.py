import re

# NOTE: deliberately does NOT match dash- or slash-separated digit groups —
# those are how dates (e.g. "01-02-2024", "01/02/2024") appear in statement
# text, and transaction dates must survive redaction intact.

# Card-style numbers grouped in 4s, e.g. "1234 5678 9012 3456".
_GROUPED_CARD_NUMBER = re.compile(r"\b\d{4}(?:[ ]\d{4}){2,3}\b")
# Bare long digit runs with no separators (typical account/card numbers).
_BARE_LONG_DIGIT_RUN = re.compile(r"\b\d{9,}\b")
# IBAN-style: 2 letters, 2 digits, then 10-30 alphanumerics.
_IBAN_LIKE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
# Masked account references, e.g. "****1234", "xxxx-1234".
_MASKED_ACCOUNT = re.compile(r"\b(?:[Xx*]{2,}[ -]?){1,}\d{2,6}\b")


def redact_account_numbers(text: str) -> str:
    """Strips account/card/IBAN-like number sequences from extracted statement
    text before it's sent to the LLM. Best-effort: it does not attempt to
    detect every possible bank's numbering scheme, only common patterns, and
    is deliberately conservative about not touching dates or transaction
    amounts (which use decimal points/commas, not bare long digit runs)."""
    text = _IBAN_LIKE.sub("[REDACTED]", text)
    text = _MASKED_ACCOUNT.sub("[REDACTED]", text)
    text = _GROUPED_CARD_NUMBER.sub("[REDACTED]", text)
    text = _BARE_LONG_DIGIT_RUN.sub("[REDACTED]", text)
    return text
