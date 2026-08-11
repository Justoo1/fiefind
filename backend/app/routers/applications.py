from fastapi import APIRouter, Depends, HTTPException
from asyncpg import Connection

from app.db import get_db
from app.dependencies import get_current_user, require_landlord
from app.models.application import ApplicationOut, ApplicationStatusUpdate

router = APIRouter()

_SELECT = """
    SELECT id, "propertyId", "tenantId", status, "bgCheckStatus", "appliedAt", "updatedAt"
    FROM application
"""


def _row_to_out(row) -> ApplicationOut:
    return ApplicationOut(
        id=row["id"],
        property_id=row["propertyId"],
        tenant_id=row["tenantId"],
        status=row["status"],
        bg_check_status=row["bgCheckStatus"],
        applied_at=row["appliedAt"],
        updated_at=row["updatedAt"],
        tenant_name=row.get("tenant_name"),
        property_title=row.get("property_title"),
        property_area=row.get("property_area"),
        property_rent_pesewas=row.get("property_rent_pesewas"),
        landlord_name=row.get("landlord_name"),
    )


@router.get("", response_model=list[ApplicationOut])
async def list_applications(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if user["role"] == "landlord":
        rows = await conn.fetch(
            """
            SELECT a.id, a."propertyId", a."tenantId", a.status,
                   a."bgCheckStatus", a."appliedAt", a."updatedAt",
                   u.name AS tenant_name, p.title AS property_title, p.area AS property_area
            FROM application a
            JOIN property p ON a."propertyId" = p.id
            JOIN "user" u ON u.id = a."tenantId"
            WHERE p."landlordId" = $1
            ORDER BY a."appliedAt" DESC
            """,
            user["id"],
        )
    elif user["role"] == "tenant":
        rows = await conn.fetch(
            """
            SELECT a.id, a."propertyId", a."tenantId", a.status,
                   a."bgCheckStatus", a."appliedAt", a."updatedAt",
                   p.title AS property_title, p.area AS property_area,
                   p."rentPesewas" AS property_rent_pesewas,
                   u.name AS landlord_name
            FROM application a
            JOIN property p ON a."propertyId" = p.id
            JOIN "user" u ON u.id = p."landlordId"
            WHERE a."tenantId" = $1
            ORDER BY a."appliedAt" DESC
            """,
            user["id"],
        )
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    return [_row_to_out(r) for r in rows]


@router.patch("/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(
    application_id: str,
    body: ApplicationStatusUpdate,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    app_row = await conn.fetchrow(
        _SELECT + "WHERE id = $1",
        application_id,
    )
    if app_row is None:
        raise HTTPException(status_code=404, detail="Application not found")

    prop_row = await conn.fetchrow(
        'SELECT "landlordId" FROM property WHERE id = $1',
        app_row["propertyId"],
    )
    if prop_row is None or prop_row["landlordId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    updated = await conn.fetchrow(
        """
        UPDATE application
        SET status = $1, "updatedAt" = NOW()
        WHERE id = $2
        RETURNING id, "propertyId", "tenantId", status, "bgCheckStatus", "appliedAt", "updatedAt"
        """,
        body.status,
        application_id,
    )
    return _row_to_out(updated)
