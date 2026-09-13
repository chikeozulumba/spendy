function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  // A dedicated var, not the shared PORT apps/api already uses — both
  // services load the same repo-root .env in local dev, and reusing PORT
  // would make this service try to bind apps/api's port instead of its own.
  port: Number(process.env.TELEGRAM_BOT_PORT ?? 8789),
  databaseUrl: required("DATABASE_URL"),
  internalServiceToken: required("INTERNAL_SERVICE_TOKEN"),

  redisUrl: required("REDIS_URL"),

  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  // Telegram's own recommended anti-spoofing mechanism (Section 9/G1): set via
  // the `secret_token` param when registering the webhook
  // (https://core.telegram.org/bots/api#setwebhook); Telegram echoes it back
  // on every request as this header, and requests without the exact match are
  // rejected before any body is even parsed.
  telegramWebhookSecret: required("TELEGRAM_WEBHOOK_SECRET"),

  storageEncryptionKey: required("STORAGE_ENCRYPTION_KEY"),
  storageEndpoint: required("STORAGE_ENDPOINT"),
  storageRegion: process.env.STORAGE_REGION ?? "auto",
  storageBucket: required("STORAGE_BUCKET"),
  storageAccessKeyId: required("STORAGE_ACCESS_KEY_ID"),
  storageSecretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
  storageForcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",

  anthropicApiKey: required("ANTHROPIC_API_KEY"),

  pdfServiceUrl: required("PDF_SERVICE_URL"),
  pdfServiceTimeoutMs: Number(process.env.PDF_SERVICE_TIMEOUT_MS ?? 55000),

  // 30 minutes of inactivity (Section 6.2) before a session is considered
  // abandoned and Redis expires the key on its own.
  sessionTtlSeconds: Number(process.env.TELEGRAM_SESSION_TTL_SECONDS ?? 1800),
};
