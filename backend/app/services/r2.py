import uuid

from app.config import settings


class R2Client:
    """
    Cloudflare R2 client for presigned PUT URL generation.

    Runs in stub mode when R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
    / R2_BUCKET_NAME are unset. Stub returns a fake URL immediately so the rest
    of the upload flow can be exercised end-to-end without real credentials.

    Real implementation: replace presign_put() body with a boto3 S3-compatible
    call to https://<account_id>.r2.cloudflarestorage.com using the access key.
    """

    def __init__(
        self,
        account_id: str | None,
        access_key: str | None,
        secret_key: str | None,
        bucket: str | None,
        public_base: str | None,
    ):
        self.stub = not all([account_id, access_key, secret_key, bucket])
        self._account_id = account_id
        self._access_key = access_key
        self._secret_key = secret_key
        self._bucket = bucket
        self._public_base = public_base or "https://stub-r2.example.com"

    async def presign_put(self, key: str, expires: int = 600) -> str:
        """Return a presigned PUT URL for the given R2 object key."""
        if self.stub:
            return f"https://stub-r2.example.com/{key}?stub=1"
        # TODO: replace with real boto3 S3-compatible presigned URL
        raise NotImplementedError("Real R2 credentials not configured")

    def get_public_url(self, key: str) -> str:
        return f"{self._public_base}/{key}"


def make_r2_client(
    account_id: str | None,
    access_key: str | None,
    secret_key: str | None,
    bucket: str | None,
    public_base: str | None,
) -> R2Client:
    return R2Client(account_id, access_key, secret_key, bucket, public_base)


_r2 = make_r2_client(
    settings.R2_ACCOUNT_ID,
    settings.R2_ACCESS_KEY_ID,
    settings.R2_SECRET_ACCESS_KEY,
    settings.R2_BUCKET_NAME,
    settings.R2_PUBLIC_BASE_URL,
)
