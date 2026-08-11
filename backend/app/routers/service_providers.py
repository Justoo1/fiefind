from datetime import datetime, timezone

from asyncpg import Connection
from fastapi import APIRouter, Depends

from app.db import get_db
from app.dependencies import get_current_user
from app.models.service_provider import ServiceProviderOut

router = APIRouter()

_SELECT = """
    SELECT u.id, u.name, u.phone, u.specialty, u."idVerified", u."createdAt",
           r.avg_rating, COALESCE(r.review_count, 0) AS review_count,
           COALESCE(c.completed_count, 0) AS completed_count
    FROM "user" u
    LEFT JOIN (
        SELECT sr."providerId" AS provider_id,
               AVG(sr.rating)::float AS avg_rating,
               COUNT(*) AS review_count
        FROM service_review sr
        GROUP BY sr."providerId"
    ) r ON r.provider_id = u.id
    LEFT JOIN (
        SELECT sb."providerId" AS provider_id,
               COUNT(*) AS completed_count
        FROM service_booking sb
        WHERE sb.status = 'completed'
        GROUP BY sb."providerId"
    ) c ON c.provider_id = u.id
    WHERE u.role = 'service_provider' AND u."idVerified" = true
"""

# Starting placeholders, not measured/negotiated thresholds — same caveat as
# the Increment 28 fraud-heuristic thresholds. Expect to tune against real
# provider track records once there's live marketplace data.
_TOP_RATED_JOBS = 50
_TOP_RATED_RATING = 4.8
_TRUSTED_PRO_JOBS = 15
_TRUSTED_PRO_RATING = 4.5
_RISING_STAR_JOBS = 3
_RISING_STAR_RATING = 4.0
_VETERAN_DAYS = 365


def _compute_badge(
    completed_count: int,
    avg_rating: float | None,
    id_verified: bool,
    created_at: datetime,
) -> str | None:
    if completed_count < _RISING_STAR_JOBS:
        return None

    rating = avg_rating or 0.0
    if completed_count >= _TOP_RATED_JOBS and rating >= _TOP_RATED_RATING and id_verified:
        tier = "Top Rated"
    elif (
        completed_count >= _TRUSTED_PRO_JOBS
        and rating >= _TRUSTED_PRO_RATING
        and id_verified
    ):
        tier = "Trusted Pro"
    elif rating >= _RISING_STAR_RATING:
        tier = "Rising Star"
    else:
        return None

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    account_age_days = (now_naive - created_at).days
    if account_age_days >= _VETERAN_DAYS and tier in ("Top Rated", "Trusted Pro"):
        return f"Veteran {tier}"
    return tier


def _row_to_out(row) -> ServiceProviderOut:
    return ServiceProviderOut(
        id=row["id"],
        name=row["name"],
        phone=row["phone"],
        specialty=row["specialty"],
        avg_rating=row["avg_rating"],
        review_count=row["review_count"],
        badge=_compute_badge(
            row["completed_count"],
            row["avg_rating"],
            row["idVerified"],
            row["createdAt"],
        ),
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
