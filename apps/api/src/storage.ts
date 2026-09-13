import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "./env.js";
import { encryptBuffer, decryptBuffer } from "./crypto.js";

const s3 = new S3Client({
  endpoint: env.storageEndpoint,
  region: env.storageRegion,
  forcePathStyle: env.storageForcePathStyle,
  credentials: {
    accessKeyId: env.storageAccessKeyId,
    secretAccessKey: env.storageSecretAccessKey,
  },
});

export function storagePathFor(statementId: string, filename: string): string {
  return `statements/${statementId}/${filename}`;
}

export async function putEncrypted(key: string, plaintext: Buffer): Promise<void> {
  const encrypted = encryptBuffer(plaintext);
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.storageBucket,
        Key: key,
        Body: encrypted,
        ContentType: "application/octet-stream",
      })
    );
  } catch (err) {
    // Wrong endpoint/bucket/credentials in production is otherwise invisible
    // until it surfaces as a generic 500 on upload — log which bucket/endpoint
    // we tried against (never the access key/secret) so a misconfigured
    // deploy is diagnosable from the logs alone.
    console.error(
      `[storage] putEncrypted failed for key=${key} bucket=${env.storageBucket} endpoint=${env.storageEndpoint}:`,
      err
    );
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.storageBucket, Key: key }));
  } catch (err) {
    console.error(
      `[storage] deleteObject failed for key=${key} bucket=${env.storageBucket} endpoint=${env.storageEndpoint}:`,
      err
    );
    throw err;
  }
}

// Reverses putEncrypted() — used to let a user view a Telegram document
// they've sent (mirrors services/pdf-service/app/storage.py's
// fetch_decrypted_pdf, same encryption scheme).
export async function fetchDecrypted(key: string): Promise<Buffer> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.storageBucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return decryptBuffer(Buffer.from(bytes));
  } catch (err) {
    console.error(
      `[storage] fetchDecrypted failed for key=${key} bucket=${env.storageBucket} endpoint=${env.storageEndpoint}:`,
      err
    );
    throw err;
  }
}

export { GetObjectCommand, s3 };
