import uuid

from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.dependencies import get_current_user, require_landlord
from app.models.lease import LeaseCreate, LeaseOut

router = APIRouter()

_SELECT = """
    SELECT id, "propertyId", "tenantId", "landlordId", "rentPesewas",
           "startDate", "endDate", "nextDueDate", status, "createdAt", "updatedAt"
    FROM lease
"""


def _row_to_out(row) -> LeaseOut:
    return LeaseOut(
        id=row["id"],
        property_id=row["propertyId"],
        tenant_id=row["tenantId"],
        landlord_id=row["landlordId"],
        rent_pesewas=row["rentPesewas"],
        start_date=row["startDate"],
        end_date=row["endDate"],
        next_due_date=row["nextDueDate"],
        status=row["status"],
        created_at=row["createdAt"],
        updated_at=row["updatedAt"],
        tenant_name=row.get("tenant_name"),
        property_title=row.get("property_title"),
        property_area=row.get("property_area"),
    )


@router.post("", response_model=LeaseOut, status_code=201)
async def create_lease(
    body: LeaseCreate,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    prop = await conn.fetchrow(
        'SELECT id FROM property WHERE id = $1 AND "landlordId" = $2',
        body.property_id,
        user["id"],
    )
    if prop is None:
        raise HTTPException(status_code=403, detail="Forbidden")

    row = await conn.fetchrow(
        """
        INSERT INTO lease (
            id, "propertyId", "tenantId", "landlordId", "rentPesewas",
            "startDate", "endDate", "nextDueDate", status, "createdAt", "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW()
        )
        RETURNING id, "propertyId", "tenantId", "landlordId", "rentPesewas",
                  "startDate", "endDate", "nextDueDate", status, "createdAt", "updatedAt"
        """,
        str(uuid.uuid4()),
        body.property_id,
        body.tenant_id,
        user["id"],
        body.rent_pesewas,
        body.start_date,
        body.end_date,
        body.next_due_date,
    )
    return _row_to_out(row)


@router.get("", response_model=list[LeaseOut])
async def list_leases(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if user["role"] == "landlord":
        rows = await conn.fetch(
            """
            SELECT l.id, l."propertyId", l."tenantId", l."landlordId", l."rentPesewas",
                   l."startDate", l."endDate", l."nextDueDate", l.status,
                   l."createdAt", l."updatedAt",
                   u.name AS tenant_name, p.title AS property_title, p.area AS property_area
            FROM lease l
            JOIN "user" u ON u.id = l."tenantId"
            JOIN property p ON p.id = l."propertyId"
            WHERE l."landlordId" = $1
            ORDER BY l."createdAt" DESC
            """,
            user["id"],
        )
    elif user["role"] == "tenant":
        rows = await conn.fetch(
            _SELECT + 'WHERE "tenantId" = $1 ORDER BY "createdAt" DESC',
            user["id"],
        )
    else:
        raise HTTPException(status_code=403, detail="Forbidden")
    return [_row_to_out(r) for r in rows]


@router.get("/{lease_id}", response_model=LeaseOut)
async def get_lease(
    lease_id: str,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(_SELECT + "WHERE id = $1", lease_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Lease not found")
    if row["landlordId"] != user["id"] and row["tenantId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _row_to_out(row)
