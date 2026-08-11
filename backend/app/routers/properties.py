import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from asyncpg import Connection

from app.db import get_db
from app.dependencies import require_landlord, require_tenant
from app.models.application import ApplicationOut
from app.models.property import PropertyCreate, PropertyOut, PropertyUpdate

router = APIRouter()

_SELECT = """
    SELECT id, "landlordId", title, type, area, region, beds, baths, sqft,
           "rentPesewas", "advanceMonths", description, amenities, status,
           "ghanaPostGps", "streetAddress", "pinX", "pinY", "createdAt", "updatedAt"
    FROM property
"""

_SELECT_PUBLIC = """
    SELECT p.id, p."landlordId", p.title, p.type, p.area, p.region, p.beds, p.baths, p.sqft,
           p."rentPesewas", p."advanceMonths", p.description, p.amenities, p.status,
           p."ghanaPostGps", p."streetAddress", p."pinX", p."pinY",
           p."createdAt", p."updatedAt", u.name AS landlord_name
    FROM property p
    JOIN "user" u ON u.id = p."landlordId"
"""


def _row_to_out(row) -> PropertyOut:
    pin_x = row["pinX"]
    pin_y = row["pinY"]
    return PropertyOut(
        id=row["id"],
        landlord_id=row["landlordId"],
        landlord_name=row.get("landlord_name"),
        title=row["title"],
        type=row["type"],
        area=row["area"],
        region=row["region"],
        beds=row["beds"],
        baths=row["baths"],
        sqft=row["sqft"],
        rent_pesewas=row["rentPesewas"],
        advance_months=row["advanceMonths"],
        description=row["description"],
        amenities=list(row["amenities"]) if row["amenities"] else [],
        status=row["status"],
        ghana_post_gps=row["ghanaPostGps"],
        street_address=row["streetAddress"],
        pin_x=float(pin_x) if pin_x is not None else None,
        pin_y=float(pin_y) if pin_y is not None else None,
        created_at=row["createdAt"],
        updated_at=row["updatedAt"],
    )


@router.get("", response_model=list[PropertyOut])
async def list_properties(
    area: str | None = Query(None),
    region: str | None = Query(None),
    type: str | None = Query(None),
    conn: Connection = Depends(get_db),
):
    rows = await conn.fetch(
        _SELECT_PUBLIC + """
        WHERE p.status = 'live'
          AND ($1::text IS NULL OR p.area ILIKE $1)
          AND ($2::text IS NULL OR p.region ILIKE $2)
          AND ($3::text IS NULL OR p.type = $3::property_type)
        ORDER BY p."createdAt" DESC
        """,
        area,
        region,
        type,
    )
    return [_row_to_out(r) for r in rows]


@router.post("", response_model=PropertyOut, status_code=201)
async def create_property(
    body: PropertyCreate,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        INSERT INTO property
          (id, "landlordId", title, type, area, region, beds, baths, sqft,
           "rentPesewas", "advanceMonths", description, amenities, status,
           "ghanaPostGps", "streetAddress", "pinX", "pinY")
        VALUES ($1, $2, $3, $4::property_type, $5, $6, $7, $8, $9, $10, $11, $12,
                $13::text[], $14::listing_status, $15, $16, $17, $18)
        RETURNING id, "landlordId", title, type, area, region, beds, baths, sqft,
                  "rentPesewas", "advanceMonths", description, amenities, status,
                  "ghanaPostGps", "streetAddress", "pinX", "pinY", "createdAt", "updatedAt"
        """,
        str(uuid.uuid4()),
        user["id"],
        body.title,
        body.type,
        body.area,
        body.region,
        body.beds,
        body.baths,
        body.sqft,
        body.rent_pesewas,
        body.advance_months,
        body.description,
        body.amenities,
        body.status,
        body.ghana_post_gps,
        body.street_address,
        body.pin_x,
        body.pin_y,
    )
    return _row_to_out(row)


@router.get("/mine", response_model=list[PropertyOut])
async def list_my_properties(
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    rows = await conn.fetch(
        _SELECT_PUBLIC + 'WHERE p."landlordId" = $1 ORDER BY p."createdAt" DESC',
        user["id"],
    )
    return [_row_to_out(r) for r in rows]


@router.get("/{property_id}", response_model=PropertyOut)
async def get_property(
    property_id: str,
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        _SELECT + "WHERE id = $1",
        property_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return _row_to_out(row)


@router.patch("/{property_id}", response_model=PropertyOut)
async def update_property(
    property_id: str,
    body: PropertyUpdate,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        """
        UPDATE property
        SET title = $1,
            type = $2::property_type,
            area = $3,
            region = $4,
            beds = $5,
            baths = $6,
            sqft = $7,
            "rentPesewas" = $8,
            "advanceMonths" = $9,
            description = $10,
            amenities = $11::text[],
            status = $12::listing_status,
            "ghanaPostGps" = $13,
            "streetAddress" = $14,
            "pinX" = $15,
            "pinY" = $16,
            "updatedAt" = NOW()
        WHERE id = $17 AND "landlordId" = $18
        RETURNING id, "landlordId", title, type, area, region, beds, baths, sqft,
                  "rentPesewas", "advanceMonths", description, amenities, status,
                  "ghanaPostGps", "streetAddress", "pinX", "pinY", "createdAt", "updatedAt"
        """,
        body.title,
        body.type,
        body.area,
        body.region,
        body.beds,
        body.baths,
        body.sqft,
        body.rent_pesewas,
        body.advance_months,
        body.description,
        body.amenities,
        body.status,
        body.ghana_post_gps,
        body.street_address,
        body.pin_x,
        body.pin_y,
        property_id,
        user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found")
    return _row_to_out(row)


@router.delete("/{property_id}", status_code=200)
async def delete_property(
    property_id: str,
    user: dict = Depends(require_landlord),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        'SELECT status FROM property WHERE id = $1 AND "landlordId" = $2',
        property_id,
        user["id"],
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Property not found")
    if row["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only draft listings can be deleted")
    await conn.execute("DELETE FROM property WHERE id = $1", property_id)
    return {"ok": True}


@router.post("/{property_id}/apply", response_model=ApplicationOut, status_code=201)
async def apply_to_property(
    property_id: str,
    user: dict = Depends(require_tenant),
    conn: Connection = Depends(get_db),
):
    prop = await conn.fetchrow("SELECT id FROM property WHERE id = $1", property_id)
    if prop is None:
        raise HTTPException(status_code=404, detail="Property not found")

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO application (id, "propertyId", "tenantId", status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, "propertyId", "tenantId", status, "bgCheckStatus", "appliedAt", "updatedAt"
            """,
            str(uuid.uuid4()),
            property_id,
            user["id"],
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Already applied")

    return ApplicationOut(
        id=row["id"],
        property_id=row["propertyId"],
        tenant_id=row["tenantId"],
        status=row["status"],
        bg_check_status=row["bgCheckStatus"],
        applied_at=row["appliedAt"],
        updated_at=row["updatedAt"],
    )
