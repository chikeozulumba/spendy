function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: required("DATABASE_URL"),
  internalServiceToken: required("INTERNAL_SERVICE_TOKEN"),
  storageEncryptionKey: required("STORAGE_ENCRYPTION_KEY"),

  storageEndpoint: required("STORAGE_ENDPOINT"),
  storageRegion: process.env.STORAGE_REGION ?? "auto",
  storageBucket: required("STORAGE_BUCKET"),
  storageAccessKeyId: required("STORAGE_ACCESS_KEY_ID"),
  storageSecretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
  storageForcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? "true") === "true",

  clerkSecretKey: required("CLERK_SECRET_KEY"),
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",

  pdfServiceUrl: required("PDF_SERVICE_URL"),
  // The pipeline runs three sequential LLM calls (extraction, categorization,
  // summary) plus PDF parsing — 55s (this fallback's old value) was too
  // tight for a real multi-page statement and aborted the request mid-flight,
  // marking the statement "failed" from a timeout rather than a real error.
  pdfServiceTimeoutMs: Number(process.env.PDF_SERVICE_TIMEOUT_MS ?? 550000),

  vapidPublicKey: required("VAPID_PUBLIC_KEY"),
  vapidPrivateKey: required("VAPID_PRIVATE_KEY"),
  vapidSubject: required("VAPID_SUBJECT"),
};
