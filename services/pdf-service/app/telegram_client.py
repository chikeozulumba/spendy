import httpx

from .config import settings


async def send_message(chat_id: str, text: str) -> int:
    """Sends the final "here's what was logged" confirmation (Section 6.5
    step 6) directly from this service — it's the one that actually knows
    what got extracted/written, so there's no reason to round-trip that back
    through the telegram-bot service first.

    Returns the sent message's Telegram message_id — the loan reminder jobs
    record it (loan_book.reminder_telegram_message_id) so services/telegram-bot
    can recognize a reply to that specific message as a repayment confirmation."""
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json={"chat_id": chat_id, "text": text})
        response.raise_for_status()
        return response.json()["result"]["message_id"]
