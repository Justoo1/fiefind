from asyncpg import Connection
from fastapi import APIRouter, Depends

from app.db import get_db
from app.dependencies import get_current_user
from app.models.service_provider import ServiceProviderOut

router = APIRouter()

_SELECT = """
    SELECT id, name, phone, specialty
    FROM "user"
    WHERE role = 'service_provider'
"""


def _row_to_out(row) -> ServiceProviderOut:
    return ServiceProviderOut(
        id=row["id"],
        name=row["name"],
        phone=row["phone"],
        specialty=row["specialty"],
    )


@router.get("", response_model=list[ServiceProviderOut])
async def list_service_providers(
    specialty: str | None = None,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if specialty:
        rows = await conn.fetch(_SELECT + " AND specialty = $1 ORDER BY name", specialty)
    else:
        rows = await conn.fetch(_SELECT + " ORDER BY name")
    return [_row_to_out(r) for r in rows]
