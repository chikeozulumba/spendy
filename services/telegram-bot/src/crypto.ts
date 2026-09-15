import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env.js";

// Same scheme as apps/api/src/crypto.ts (and its Python mirror in
// services/pdf-service/app/storage.py::decrypt_bytes) — [12-byte IV][16-byte
// auth tag][ciphertext] — so a document uploaded here decrypts correctly
// wherever it's later read from (the pdf-service's telegram processing
// endpoint).
const key = Buffer.from(env.storageEncryptionKey, "base64");
if (key.length !== 32) {
  throw new Error("STORAGE_ENCRYPTION_KEY must decode to 32 bytes (base64)");
}

export function encryptBuffer(plaintext: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

// Needed to decrypt a user's own stored Anthropic API key (apps/api encrypts
// it with this same shared key when it's saved).
export function decryptBuffer(payload: Buffer): Buffer {
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
