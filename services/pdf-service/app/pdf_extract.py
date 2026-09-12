import io

import pdfplumber
import pikepdf


class PdfPasswordError(Exception):
    """Raised when a PDF is encrypted and the supplied password (or lack of one) fails."""


def decrypt_if_needed(pdf_bytes: bytes, password: str | None) -> bytes:
    """Returns plain (unencrypted) PDF bytes, decrypting with `password` if the
    PDF is password-protected. Password is used only in-memory here and is
    never logged or persisted by any caller."""
    try:
        with pikepdf.open(io.BytesIO(pdf_bytes), password=password or "") as pdf:
            out = io.BytesIO()
            pdf.save(out)
            return out.getvalue()
    except pikepdf.PasswordError as exc:
        raise PdfPasswordError("PDF is password-protected; a valid password is required") from exc


def extract_text(pdf_bytes: bytes) -> str:
    """Extracts text from every page, preserving row/line structure as much as
    pdfplumber's layout mode allows, and clearly marking page boundaries so the
    downstream LLM extraction step doesn't lose or duplicate rows that
    straddle a page break."""
    pages_text: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text(layout=True) or ""
            pages_text.append(f"--- page {i + 1} ---\n{text}")
    return "\n".join(pages_text)
