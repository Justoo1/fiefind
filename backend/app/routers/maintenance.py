import uuid

from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.dependencies import get_current_user, require_landlord, require_tenant
from app.models.maintenance import (
    MaintenanceTicketCreate,
    MaintenanceTicketOut,
    MaintenanceTicketStatusUpdate,
)
from app.models.service_provider import AssignArtisanRequest

router = APIRouter()

_SELECT = """
    SELECT mt.id, mt."propertyId", mt."leaseId", mt."tenantId",
           mt.title, mt.category, mt.description, mt."artisanId",
           mt.status, mt."createdAt", mt."updatedAt",
           artisan.name AS artisan_name
    FROM maintenance_ticket mt
    LEFT JOIN "user" artisan ON artisan.id = mt."artisanId"
"""


def _row_to_out(row) -> MaintenanceTicketOut:
    return MaintenanceTicketOut(
        id=row["id"],
        property_id=row["propertyId"],
        lease_id=row["leaseId"],
        tenant_id=row["tenantId"],
        title=row["title"],
        category=row["category"],
        description=row["description"],
        artisan_id=row["artisanId"],
        status=row["status"],
        created_at=row["createdAt"],
        updated_at=row["updatedAt"],
        tenant_name=row.get("tenant_name"),
        property_title=row.get("property_title"),
        property_area=row.get("property_area"),
        artisan_name=row.get("artisan_name"),
    )


@router.post("", response_model=MaintenanceTicketOut, status_code=201)
async def create_ticket(
    body: MaintenanceTicketCreate,
    user: dict = Depends(require_tenant),
    conn: Connection = Depends(get_db),
):
    prop = await conn.fetchrow(
        "SELECT id FROM property WHERE id = $1",
        body.property_id,
    )
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found")

    if body.lease_id is not None:
        lease = await conn.fetchrow(
            'SELECT id FROM lease WHERE id = $1 AND "tenantId" = $2',
            body.lease_id,
            user["id"],
        )
        if lease is None:
            raise HTTPException(status_code=403, detail="Forbidden")

    row = await conn.fetchrow(
        """
        INSERT INTO maintenance_ticket (
            id, "propertyId", "leaseId", "tenantId",
            title, category, description, status, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW(), NOW())
        RETURNING id, "propertyId", "leaseId", "tenantId",
                  title, category, description, "artisanId",
                  status, "createdAt", "updatedAt"
        """,
        str(uuid.uuid4()),
        body.property_id,
        body.lease_id,
        user["id"],
        body.title,
        body.category,
        body.description,
    )
    return _row_to_out(row)


@router.get("", response_model=list[MaintenanceTicketOut])
async def list_tickets(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if user["role"] == "tenant":
        rows = await conn.fetch(
            _SELECT + 'WHERE mt."tenantId" = $1 ORDER BY mt."createdAt" DESC',
            user["id"],
        )
    elif user["role"] == "landlord":
        rows = await conn.fetch(
            """
            SELECT mt.id, mt."propertyId", mt."leaseId", mt."tenantId",
                   mt.title, mt.category, mt.description, mt."artisanId",
                   mt.status, mt."createdAt", mt."updatedAt",
                   u.name AS tenant_name, p.title AS property_title, p.area AS property_area,
                   artisan.name AS artisan_name
            FROM maintenance_ticket mt
            JOIN property p ON p.id = mt."propertyId"
            JOIN "user" u ON u.id = mt."tenantId"
            LEFT JOIN "user" artisan ON artisan.id = mt."artisanId"
            WHERE p."landlordId" = $1
            ORDER BY mt."createdAt" DESC
            """,
            user["id"],
        )
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    return [_row_to_out(r) for r in rows]


@router.get("/{ticket_id}", response_model=MaintenanceTicketOut)
async def get_ticket(
    ticket_id: str,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        SELECT mt.id, mt."propertyId", mt."leaseId", mt."tenantId",
               mt.title, mt.category, mt.description, mt."artisanId",
               mt.status, mt."createdAt", mt."updatedAt",
               p."landlordId",
               artisan.name AS artisan_name
        FROM maintenance_ticket mt
        JOIN property p ON p.id = mt."propertyId"
        LEFT JOIN "user" artisan ON artisan.id = mt."artisanId"
        WHERE mt.id = $1
        """,
        ticket_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if row["tenantId"] != user["id"] and row["landlordId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _row_to_out(row)


@router.patch("/{ticket_id}/status", response_model=MaintenanceTicketOut)
async def update_ticket_status(
    ticket_id: str,
    body: MaintenanceTicketStatusUpdate,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    meta = await conn.fetchrow(
        """
        SELECT mt."artisanId", p."landlordId"
        FROM maintenance_ticket mt
        JOIN property p ON p.id = mt."propertyId"
        WHERE mt.id = $1
        """,
        ticket_id,
    )
    if meta is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    is_landlord = meta["landlordId"] == user["id"]
    is_assigned_artisan = meta["artisanId"] == user["id"]
    if not (is_landlord or is_assigned_artisan):
        raise HTTPException(status_code=403, detail="Forbidden")

    row = await conn.fetchrow(
        """
        WITH updated AS (
            UPDATE maintenance_ticket
            SET status = $1, "updatedAt" = NOW()
            WHERE id = $2
            RETURNING id, "propertyId", "leaseId", "tenantId",
                      title, category, description, "artisanId",
                      status, "createdAt", "updatedAt"
        )
        SELECT u.*, artisan.name AS artisan_name
        FROM updated u
        LEFT JOIN "user" artisan ON artisan.id = u."artisanId"
        """,
        body.status,
        ticket_id,
    )
    return _row_to_out(row)


@router.patch("/{ticket_id}/assign", response_model=MaintenanceTicketOut)
async def assign_artisan(
    ticket_id: str,
    body: AssignArtisanRequest,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    meta = await conn.fetchrow(
        """
        SELECT p."landlordId", mt.status
        FROM maintenance_ticket mt
        JOIN property p ON p.id = mt."propertyId"
        WHERE mt.id = $1
        """,
        ticket_id,
    )
    if meta is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if meta["landlordId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    artisan = await conn.fetchrow(
        "SELECT id FROM \"user\" WHERE id = $1 AND role = 'service_provider'",
        body.artisan_id,
    )
    if artisan is None:
        raise HTTPException(status_code=404, detail="Artisan not found")

    new_status = meta["status"]
    if new_status in ("open", "scheduled"):
        new_status = "in_progress"

    row = await conn.fetchrow(
        """
        WITH updated AS (
            UPDATE maintenance_ticket
            SET "artisanId" = $1, status = $2, "updatedAt" = NOW()
            WHERE id = $3
            RETURNING id, "propertyId", "leaseId", "tenantId",
                      title, category, description, "artisanId",
                      status, "createdAt", "updatedAt"
        )
        SELECT u.*, artisan.name AS artisan_name
        FROM updated u
        LEFT JOIN "user" artisan ON artisan.id = u."artisanId"
        """,
        body.artisan_id,
        new_status,
        ticket_id,
    )
    return _row_to_out(row)
