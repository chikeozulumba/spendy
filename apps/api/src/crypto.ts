import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env.js";

// Application-level encryption at rest for raw PDF bytes, on top of whatever
// the storage backend (R2/MinIO) does natively. Layout: [12-byte IV][16-byte
// auth tag][ciphertext].
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

export function decryptBuffer(payload: Buffer): Buffer {
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
