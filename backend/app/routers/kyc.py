import uuid
from datetime import datetime, timezone

from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.db import get_db
from app.dependencies import get_current_user
from app.models.kyc import KycInitiateRequest, KycStatusOut, KycWebhookPayload
from app.services.smile_id import make_smile_id_client

router = APIRouter()

_smile = make_smile_id_client(settings.SMILE_ID_PARTNER_ID, settings.SMILE_ID_API_KEY)

_SELECT = """
    SELECT id, "userId", "smileJobId", "ghanaCardNumber", status,
           "verifiedAt", "failureReason", "createdAt", "updatedAt"
    FROM kyc_verification
"""


def _row_to_out(row) -> KycStatusOut:
    return KycStatusOut(
        id=row["id"],
        user_id=row["userId"],
        status=row["status"],
        smile_job_id=row["smileJobId"],
        ghana_card_number=row["ghanaCardNumber"],
        verified_at=row["verifiedAt"],
        failure_reason=row["failureReason"],
        created_at=row["createdAt"],
        updated_at=row["updatedAt"],
    )


@router.post("/initiate", response_model=KycStatusOut, status_code=202)
async def initiate_kyc(
    body: KycInitiateRequest,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    job_id = await _smile.submit_docvv(
        user_id=user["id"],
        ghana_card_number=body.ghana_card_number,
        id_image_base64=body.id_image_base64,
        selfie_image_base64=body.selfie_image_base64,
    )

    row = await conn.fetchrow(
        """
        INSERT INTO kyc_verification (
            id, "userId", provider, "smileJobId", "ghanaCardNumber",
            status, "createdAt", "updatedAt"
        ) VALUES ($1, $2, 'smile_id', $3, $4, 'pending', NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
            "smileJobId"      = EXCLUDED."smileJobId",
            "ghanaCardNumber" = EXCLUDED."ghanaCardNumber",
            status            = 'pending',
            "failureReason"   = NULL,
            "verifiedAt"      = NULL,
            "updatedAt"       = NOW()
        RETURNING id, "userId", "smileJobId", "ghanaCardNumber", status,
                  "verifiedAt", "failureReason", "createdAt", "updatedAt"
        """,
        str(uuid.uuid4()),
        user["id"],
        job_id,
        body.ghana_card_number,
    )
    return _row_to_out(row)


@router.post("/webhook", status_code=200)
async def kyc_webhook(
    payload: KycWebhookPayload,
    conn: Connection = Depends(get_db),
):
    # TODO: validate Smile ID HMAC-SHA256 signature using SMILE_ID_WEBHOOK_SECRET
    # when real credentials are in place.

    passed = payload.ResultCode == "0810"
    new_status = "passed" if passed else "failed"
    failure_reason = None if passed else payload.ResultText
    # Computed in Python rather than a SQL CASE on the same placeholder as the
    # enum column assignment below — asyncpg's prepared-statement type
    # inference can't reconcile "$1 used as kyc_status" with "$1 compared to
    # a text literal" in the same statement (AmbiguousParameterError).
    verified_at = datetime.now(timezone.utc).replace(tzinfo=None) if passed else None

    row = await conn.fetchrow(
        """
        UPDATE kyc_verification
        SET status          = $1,
            "failureReason" = $2,
            "verifiedAt"    = $3,
            "updatedAt"     = NOW()
        WHERE "smileJobId" = $4
        RETURNING id, "userId"
        """,
        new_status,
        failure_reason,
        verified_at,
        payload.SmileJobID,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Job not found")

    # Keep the user's idVerified flag in sync with their latest KYC result —
    # this is what the "✓ KYC Verified" badge (and the marketplace verified-only
    # gate) actually reads.
    await conn.execute(
        'UPDATE "user" SET "idVerified" = $1 WHERE id = $2',
        passed,
        row["userId"],
    )
    return {"ok": True}


@router.get("/status", response_model=KycStatusOut)
async def get_kyc_status(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        _SELECT + 'WHERE "userId" = $1',
        user["id"],
    )
    if row is None:
        return KycStatusOut(user_id=user["id"], status="not_started")
    return _row_to_out(row)
