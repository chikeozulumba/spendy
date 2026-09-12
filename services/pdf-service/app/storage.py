import base64

import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import settings

_key = base64.b64decode(settings.storage_encryption_key_b64)
if len(_key) != 32:
    raise RuntimeError("STORAGE_ENCRYPTION_KEY must decode to 32 bytes (base64)")

_s3 = boto3.client(
    "s3",
    endpoint_url=settings.storage_endpoint,
    region_name=settings.storage_region,
    aws_access_key_id=settings.storage_access_key_id,
    aws_secret_access_key=settings.storage_secret_access_key,
)


def decrypt_bytes(payload: bytes) -> bytes:
    """Reverses apps/api/src/crypto.ts::encryptBuffer.

    Layout: [12-byte IV][16-byte auth tag][ciphertext]. AESGCM in the
    `cryptography` package expects ciphertext+tag concatenated, so we
    reassemble that from the stored [iv][tag][ciphertext] layout.
    """
    iv = payload[:12]
    tag = payload[12:28]
    ciphertext = payload[28:]
    aesgcm = AESGCM(_key)
    return aesgcm.decrypt(iv, ciphertext + tag, None)


def fetch_decrypted_pdf(storage_path: str) -> bytes:
    obj = _s3.get_object(Bucket=settings.storage_bucket, Key=storage_path)
    encrypted = obj["Body"].read()
    return decrypt_bytes(encrypted)


def delete_object(storage_path: str) -> None:
    _s3.delete_object(Bucket=settings.storage_bucket, Key=storage_path)
