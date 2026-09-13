import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";
import { encryptBuffer } from "./crypto.js";

const s3 = new S3Client({
  endpoint: env.storageEndpoint,
  region: env.storageRegion,
  forcePathStyle: env.storageForcePathStyle,
  credentials: {
    accessKeyId: env.storageAccessKeyId,
    secretAccessKey: env.storageSecretAccessKey,
  },
});

// Documents/receipts get a chat-scoped, timestamped key — deliberately not
// nested under any statement (there isn't one) and distinguishable from the
// core pipeline's statements/{id}/ prefix at a glance.
export function storagePathFor(chatId: string, filename: string): string {
  return `telegram/${chatId}/${Date.now()}-${filename}`;
}

export async function putEncrypted(key: string, plaintext: Buffer, contentType: string): Promise<void> {
  const encrypted = encryptBuffer(plaintext);
  await s3.send(
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
      Body: encrypted,
      ContentType: contentType,
    })
  );
}
