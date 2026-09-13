import os


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


class Settings:
    port: int = int(os.environ.get("PDF_SERVICE_PORT", "8000"))
    database_url: str = _required("DATABASE_URL")
    internal_service_token: str = _required("INTERNAL_SERVICE_TOKEN")
    storage_encryption_key_b64: str = _required("STORAGE_ENCRYPTION_KEY")

    storage_endpoint: str = _required("STORAGE_ENDPOINT")
    storage_region: str = os.environ.get("STORAGE_REGION", "auto")
    storage_bucket: str = _required("STORAGE_BUCKET")
    storage_access_key_id: str = _required("STORAGE_ACCESS_KEY_ID")
    storage_secret_access_key: str = _required("STORAGE_SECRET_ACCESS_KEY")

    anthropic_api_key: str = _required("ANTHROPIC_API_KEY")
    retention_days: int = int(os.environ.get("RETENTION_DAYS", "30"))

    # Needed here (not just in the telegram-bot service) because this
    # service sends the final "here's what was logged" confirmation itself,
    # once processing completes — see telegram_processing.py.
    telegram_bot_token: str = _required("TELEGRAM_BOT_TOKEN")


settings = Settings()
