import uuid

import asyncpg
from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.db import get_db
from app.dependencies import get_current_user
from app.models.service_booking import (
    ServiceBookingCreate,
    ServiceBookingOut,
    ServiceBookingRespond,
    ServiceBookingStatusUpdate,
)
from app.models.service_payment import ServicePaymentInitiateRequest, ServicePaymentOut
from app.models.service_review import ServiceReviewCreate, ServiceReviewOut
from app.services.hubtel import make_hubtel_client

router = APIRouter()

_hubtel = make_hubtel_client(
    settings.HUBTEL_CLIENT_ID,
    settings.HUBTEL_CLIENT_SECRET,
    settings.HUBTEL_ACCOUNT_NUMBER,
    settings.HUBTEL_CALLBACK_URL,
)


def _row_to_payment_out(row) -> ServicePaymentOut:
    return ServicePaymentOut(
        id=row["id"],
        service_booking_id=row["serviceBookingId"],
        payer_id=row["payerId"],
        amount_pesewas=row["amountPesewas"],
        platform_fee_pesewas=row["platformFeePesewas"],
        provider_payout_pesewas=row["providerPayoutPesewas"],
        hubtel_reference=row["hubtelReference"],
        status=row["status"],
        paid_at=row["paidAt"],
        created_at=row["createdAt"],
    )

_SELECT = """
    SELECT sb.id, sb."requesterId", sb."providerId", sb."propertyId", sb.title,
           sb.category, sb.description, sb.status, sb."agreedPricePesewas",
           sb."scheduledFor", sb."createdAt", sb."updatedAt",
           req.name AS requester_name, prov.name AS provider_name
    FROM service_booking sb
    JOIN "user" req ON req.id = sb."requesterId"
    JOIN "user" prov ON prov.id = sb."providerId"
"""


def _row_to_out(row) -> ServiceBookingOut:
    return ServiceBookingOut(
        id=row["id"],
        requester_id=row["requesterId"],
        provider_id=row["providerId"],
        property_id=row["propertyId"],
        title=row["title"],
        category=row["category"],
        description=row["description"],
        status=row["status"],
        agreed_price_pesewas=row["agreedPricePesewas"],
        scheduled_for=row["scheduledFor"],
        created_at=row["createdAt"],
        updated_at=row["updatedAt"],
        requester_name=row.get("requester_name"),
        provider_name=row.get("provider_name"),
    )


@router.post("", response_model=ServiceBookingOut, status_code=201)
async def create_booking(
    body: ServiceBookingCreate,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    provider = await conn.fetchrow(
        """
        SELECT id FROM "user"
        WHERE id = $1 AND role = 'service_provider' AND "idVerified" = true
        """,
        body.provider_id,
    )
    if provider is None:
        raise HTTPException(status_code=404, detail="Service provider not found")

    row = await conn.fetchrow(
        """
        WITH inserted AS (
            INSERT INTO service_booking (
                id, "requesterId", "providerId", "propertyId", title, category,
                description, status, "scheduledFor", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested', $8, NOW(), NOW())
            RETURNING id, "requesterId", "providerId", "propertyId", title, category,
                      description, status, "agreedPricePesewas", "scheduledFor",
                      "createdAt", "updatedAt"
        )
        SELECT i.*, req.name AS requester_name, prov.name AS provider_name
        FROM inserted i
        JOIN "user" req ON req.id = i."requesterId"
        JOIN "user" prov ON prov.id = i."providerId"
        """,
        str(uuid.uuid4()),
        user["id"],
        body.provider_id,
        body.property_id,
        body.title,
        body.category,
        body.description,
        body.scheduled_for,
    )
    return _row_to_out(row)


@router.get("", response_model=list[ServiceBookingOut])
async def list_bookings(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    rows = await conn.fetch(
        _SELECT + 'WHERE sb."requesterId" = $1 OR sb."providerId" = $1 ORDER BY sb."createdAt" DESC',
        user["id"],
    )
    return [_row_to_out(r) for r in rows]


@router.patch("/{booking_id}/respond", response_model=ServiceBookingOut)
async def respond_to_booking(
    booking_id: str,
    body: ServiceBookingRespond,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        'SELECT "providerId", status FROM service_booking WHERE id = $1',
        booking_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if row["providerId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if row["status"] != "requested":
        raise HTTPException(status_code=409, detail="Booking has already been responded to")

    if body.accept:
        if not body.agreed_price_pesewas:
            raise HTTPException(
                status_code=422, detail="agreed_price_pesewas is required to accept a booking"
            )
        new_status = "accepted"
        agreed_price = body.agreed_price_pesewas
    else:
        new_status = "declined"
        agreed_price = None

    updated = await conn.fetchrow(
        """
        WITH updated AS (
            UPDATE service_booking
            SET status = $1, "agreedPricePesewas" = $2, "updatedAt" = NOW()
            WHERE id = $3
            RETURNING id, "requesterId", "providerId", "propertyId", title, category,
                      description, status, "agreedPricePesewas", "scheduledFor",
                      "createdAt", "updatedAt"
        )
        SELECT u.*, req.name AS requester_name, prov.name AS provider_name
        FROM updated u
        JOIN "user" req ON req.id = u."requesterId"
        JOIN "user" prov ON prov.id = u."providerId"
        """,
        new_status,
        agreed_price,
        booking_id,
    )
    return _row_to_out(updated)


@router.patch("/{booking_id}/status", response_model=ServiceBookingOut)
async def update_booking_status(
    booking_id: str,
    body: ServiceBookingStatusUpdate,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    row = await conn.fetchrow(
        'SELECT "requesterId", "providerId", status FROM service_booking WHERE id = $1',
        booking_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_requester = row["requesterId"] == user["id"]
    is_provider = row["providerId"] == user["id"]
    if not (is_requester or is_provider):
        raise HTTPException(status_code=403, detail="Forbidden")

    current = row["status"]
    new_status = body.status

    # Only the requester can ever mark a booking completed or cancel it — a
    # provider can never self-certify their own finished work.
    allowed = (
        (is_provider and current == "accepted" and new_status == "in_progress")
        or (is_requester and current == "in_progress" and new_status == "completed")
        or (
            is_requester
            and current in ("requested", "accepted", "in_progress")
            and new_status == "cancelled"
        )
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="This status change is not allowed")

    updated = await conn.fetchrow(
        """
        WITH updated AS (
            UPDATE service_booking
            SET status = $1, "updatedAt" = NOW()
            WHERE id = $2
            RETURNING id, "requesterId", "providerId", "propertyId", title, category,
                      description, status, "agreedPricePesewas", "scheduledFor",
                      "createdAt", "updatedAt"
        )
        SELECT u.*, req.name AS requester_name, prov.name AS provider_name
        FROM updated u
        JOIN "user" req ON req.id = u."requesterId"
        JOIN "user" prov ON prov.id = u."providerId"
        """,
        new_status,
        booking_id,
    )
    return _row_to_out(updated)


@router.post("/{booking_id}/pay", response_model=ServicePaymentOut, status_code=201)
async def pay_for_booking(
    booking_id: str,
    body: ServicePaymentInitiateRequest,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    booking = await conn.fetchrow(
        'SELECT "requesterId", status, "agreedPricePesewas" FROM service_booking WHERE id = $1',
        booking_id,
    )
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["requesterId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if booking["status"] != "accepted":
        raise HTTPException(status_code=409, detail="Booking is not ready to be paid for")

    agreed_price = booking["agreedPricePesewas"]
    platform_fee = agreed_price * settings.PLATFORM_FEE_BPS // 10000
    provider_payout = agreed_price - platform_fee

    payment_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO service_payment (
            id, "serviceBookingId", "payerId", "amountPesewas",
            "platformFeePesewas", "providerPayoutPesewas", status, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        """,
        payment_id,
        booking_id,
        user["id"],
        agreed_price,
        platform_fee,
        provider_payout,
    )

    hubtel_ref = await _hubtel.receive_money(
        amount_pesewas=agreed_price,
        phone_number=body.phone_number,
        description=f"Payment for service booking {booking_id}",
    )

    row = await conn.fetchrow(
        """
        UPDATE service_payment SET "hubtelReference" = $1 WHERE id = $2
        RETURNING id, "serviceBookingId", "payerId", "amountPesewas",
                  "platformFeePesewas", "providerPayoutPesewas",
                  "hubtelReference", status, "paidAt", "createdAt"
        """,
        hubtel_ref,
        payment_id,
    )
    return _row_to_payment_out(row)


@router.post("/{booking_id}/review", response_model=ServiceReviewOut, status_code=201)
async def review_booking(
    booking_id: str,
    body: ServiceReviewCreate,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    booking = await conn.fetchrow(
        'SELECT "requesterId", "providerId", status FROM service_booking WHERE id = $1',
        booking_id,
    )
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["requesterId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if booking["status"] != "completed":
        raise HTTPException(status_code=409, detail="Booking is not completed yet")

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO service_review (
                id, "bookingId", "providerId", "reviewerId", rating, comment, "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, "bookingId", "providerId", "reviewerId", rating, comment, "createdAt"
            """,
            str(uuid.uuid4()),
            booking_id,
            booking["providerId"],
            user["id"],
            body.rating,
            body.comment,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Booking already reviewed")

    return ServiceReviewOut(
        id=row["id"],
        booking_id=row["bookingId"],
        provider_id=row["providerId"],
        reviewer_id=row["reviewerId"],
        rating=row["rating"],
        comment=row["comment"],
        created_at=row["createdAt"],
    )
