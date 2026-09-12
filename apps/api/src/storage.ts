import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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

export function storagePathFor(statementId: string, filename: string): string {
  return `statements/${statementId}/${filename}`;
}

export async function putEncrypted(key: string, plaintext: Buffer): Promise<void> {
  const encrypted = encryptBuffer(plaintext);
  await s3.send(
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
      Body: encrypted,
      ContentType: "application/octet-stream",
    })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.storageBucket, Key: key }));
}

export { GetObjectCommand, s3 };
