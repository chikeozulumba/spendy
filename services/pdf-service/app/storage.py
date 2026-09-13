import base64
import logging

import boto3
import botocore.exceptions
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import settings

logger = logging.getLogger("pdf-service.storage")

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
    try:
        return aesgcm.decrypt(iv, ciphertext + tag, None)
    except InvalidTag:
        # Almost always STORAGE_ENCRYPTION_KEY not matching the key
        # apps/api encrypted this object with (different value per
        # environment, or one side rotated without the other) — the
        # generic "InvalidTag" from the crypto library gives no hint of
        # that on its own.
        logger.error(
            "Decryption failed (InvalidTag) — STORAGE_ENCRYPTION_KEY likely doesn't match "
            "the key this object was encrypted with (%d byte payload)",
            len(payload),
        )
        raise


def fetch_decrypted_pdf(storage_path: str) -> bytes:
    try:
        obj = _s3.get_object(Bucket=settings.storage_bucket, Key=storage_path)
        encrypted = obj["Body"].read()
    except botocore.exceptions.ClientError as exc:
        logger.error(
            "S3 get_object failed for key=%s bucket=%s endpoint=%s: %s",
            storage_path,
            settings.storage_bucket,
            settings.storage_endpoint,
            exc,
        )
        raise
    return decrypt_bytes(encrypted)


def delete_object(storage_path: str) -> None:
    try:
        _s3.delete_object(Bucket=settings.storage_bucket, Key=storage_path)
    except botocore.exceptions.ClientError as exc:
        logger.error(
            "S3 delete_object failed for key=%s bucket=%s endpoint=%s: %s",
            storage_path,
            settings.storage_bucket,
            settings.storage_endpoint,
            exc,
        )
        raise
