import os
import uuid

from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.dependencies import get_current_user, require_landlord
from app.models.document import (
    CreateDigitalDocRequest,
    DocumentOut,
    DocumentUploadRequest,
    UploadUrlResponse,
)
from app.services.r2 import _r2

router = APIRouter()

_SELECT = """
    SELECT id, "propertyId", "leaseId", title, "storageKey",
           "landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"
    FROM property_document
"""


def _row_to_out(row) -> DocumentOut:
    key = row["storageKey"]
    return DocumentOut(
        id=row["id"],
        property_id=row["propertyId"],
        lease_id=row["leaseId"],
        title=row["title"],
        storage_key=key,
        download_url=_r2.get_public_url(key) if key else None,
        landlord_signed=row["landlordSigned"],
        tenant_signed=row["tenantSigned"],
        is_digital=row["isDigital"],
        clauses=list(row["clauses"] or []),
        uploaded_at=row["uploadedAt"],
    )


async def _check_property_ownership(
    property_id: str, landlord_id: str, conn: Connection
) -> None:
    prop = await conn.fetchrow(
        'SELECT id FROM property WHERE id = $1 AND "landlordId" = $2',
        property_id,
        landlord_id,
    )
    if prop is None:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post(
    "/properties/{property_id}/documents/upload-url",
    response_model=UploadUrlResponse,
    status_code=201,
)
async def request_upload_url(
    property_id: str,
    body: DocumentUploadRequest,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    await _check_property_ownership(property_id, user["id"], conn)

    ext = os.path.splitext(body.file_name)[1].lower() if body.file_name else ".pdf"
    key = f"documents/{property_id}/{uuid.uuid4()}{ext}"
    presigned_url = await _r2.presign_put(key)

    row = await conn.fetchrow(
        """
        INSERT INTO property_document (
            id, "propertyId", "leaseId", title, "storageKey",
            "landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, false, false, false, '{}', NOW()
        )
        RETURNING id, "propertyId", "leaseId", title, "storageKey",
                  "landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"
        """,
        str(uuid.uuid4()),
        property_id,
        body.lease_id,
        body.title,
        key,
    )

    return UploadUrlResponse(url=presigned_url, document=_row_to_out(row))


@router.post(
    "/properties/{property_id}/documents/create-digital",
    response_model=DocumentOut,
    status_code=201,
)
async def create_digital_document(
    property_id: str,
    body: CreateDigitalDocRequest,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    await _check_property_ownership(property_id, user["id"], conn)

    row = await conn.fetchrow(
        """
        INSERT INTO property_document (
            id, "propertyId", "leaseId", title, "storageKey",
            "landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"
        ) VALUES (
            $1, $2, $3, $4, NULL, false, false, true, $5, NOW()
        )
        RETURNING id, "propertyId", "leaseId", title, "storageKey",
                  "landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"
        """,
        str(uuid.uuid4()),
        property_id,
        body.lease_id,
        body.title,
        body.clauses,
    )
    return _row_to_out(row)


@router.get(
    "/properties/{property_id}/documents",
    response_model=list[DocumentOut],
)
async def list_property_documents(
    property_id: str,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if user["role"] == "landlord":
        await _check_property_ownership(property_id, user["id"], conn)
    elif user["role"] == "tenant":
        lease = await conn.fetchrow(
            'SELECT id FROM lease WHERE "propertyId" = $1 AND "tenantId" = $2',
            property_id,
            user["id"],
        )
        if lease is None:
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = await conn.fetch(
        _SELECT + 'WHERE "propertyId" = $1 ORDER BY "uploadedAt" DESC',
        property_id,
    )
    return [_row_to_out(r) for r in rows]


@router.patch("/documents/{doc_id}/sign", response_model=DocumentOut)
async def sign_document(
    doc_id: str,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    doc = await conn.fetchrow(
        'SELECT pd.*, p."landlordId" FROM property_document pd '
        'JOIN property p ON p.id = pd."propertyId" WHERE pd.id = $1',
        doc_id,
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if user["role"] == "landlord":
        if doc["landlordId"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        column = '"landlordSigned"'
    elif user["role"] == "tenant":
        lease = await conn.fetchrow(
            'SELECT id FROM lease WHERE "propertyId" = $1 AND "tenantId" = $2',
            doc["propertyId"],
            user["id"],
        )
        if lease is None:
            raise HTTPException(status_code=403, detail="Forbidden")
        column = '"tenantSigned"'
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    row = await conn.fetchrow(
        f'UPDATE property_document SET {column} = true WHERE id = $1 '
        f'RETURNING id, "propertyId", "leaseId", title, "storageKey", '
        f'"landlordSigned", "tenantSigned", "isDigital", clauses, "uploadedAt"',
        doc_id,
    )
    return _row_to_out(row)
