import httpx

from .config import settings


async def send_message(chat_id: str, text: str) -> None:
    """Sends the final "here's what was logged" confirmation (Section 6.5
    step 6) directly from this service — it's the one that actually knows
    what got extracted/written, so there's no reason to round-trip that back
    through the telegram-bot service first."""
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json={"chat_id": chat_id, "text": text})
        response.raise_for_status()
