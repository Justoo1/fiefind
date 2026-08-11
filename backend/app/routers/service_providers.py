from asyncpg import Connection
from fastapi import APIRouter, Depends

from app.db import get_db
from app.dependencies import get_current_user
from app.models.service_provider import ServiceProviderOut

router = APIRouter()

_SELECT = """
    SELECT u.id, u.name, u.phone, u.specialty,
           r.avg_rating, COALESCE(r.review_count, 0) AS review_count
    FROM "user" u
    LEFT JOIN (
        SELECT sr."providerId" AS provider_id,
               AVG(sr.rating)::float AS avg_rating,
               COUNT(*) AS review_count
        FROM service_review sr
        GROUP BY sr."providerId"
    ) r ON r.provider_id = u.id
    WHERE u.role = 'service_provider'
"""


def _row_to_out(row) -> ServiceProviderOut:
    return ServiceProviderOut(
        id=row["id"],
        name=row["name"],
        phone=row["phone"],
        specialty=row["specialty"],
        avg_rating=row["avg_rating"],
        review_count=row["review_count"],
    )


@router.get("", response_model=list[ServiceProviderOut])
async def list_service_providers(
    specialty: str | None = None,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if specialty:
        rows = await conn.fetch(_SELECT + " AND u.specialty = $1 ORDER BY u.name", specialty)
    else:
        rows = await conn.fetch(_SELECT + " ORDER BY u.name")
    return [_row_to_out(r) for r in rows]
