import uuid

from asyncpg import Connection
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import settings
from app.db import get_db
from app.dependencies import get_current_user, require_tenant
from app.models.payment import (
    EscrowEntryOut,
    HubtelWebhookPayload,
    PaymentInitiateRequest,
    PaymentOut,
)
from app.services.hubtel import make_hubtel_client

router = APIRouter()
escrow_router = APIRouter()

_hubtel = make_hubtel_client(
    settings.HUBTEL_CLIENT_ID,
    settings.HUBTEL_CLIENT_SECRET,
    settings.HUBTEL_ACCOUNT_NUMBER,
    settings.HUBTEL_CALLBACK_URL,
)

_SELECT_PAYMENT = """
    SELECT id, "leaseId", "payerId", "amountPesewas", "hubtelReference",
           status, "paidAt", "createdAt"
    FROM payment
"""

_SELECT_ESCROW = """
    SELECT el.id, el."leaseId", el."fromUserId", el."toUserId", el."amountPesewas",
           el."entryType", el."hubtelReference", el.description, el."createdAt"
    FROM escrow_ledger el
    JOIN lease l ON l.id = el."leaseId"
"""


def _row_to_payment(row) -> PaymentOut:
    return PaymentOut(
        id=row["id"],
        lease_id=row["leaseId"],
        payer_id=row["payerId"],
        amount_pesewas=row["amountPesewas"],
        hubtel_reference=row["hubtelReference"],
        status=row["status"],
        paid_at=row["paidAt"],
        created_at=row["createdAt"],
    )


def _row_to_escrow(row) -> EscrowEntryOut:
    return EscrowEntryOut(
        id=row["id"],
        lease_id=row["leaseId"],
        from_user_id=row["fromUserId"],
        to_user_id=row["toUserId"],
        amount_pesewas=row["amountPesewas"],
        entry_type=row["entryType"],
        hubtel_reference=row["hubtelReference"],
        description=row["description"],
        created_at=row["createdAt"],
    )


@router.post("/initiate", response_model=PaymentOut, status_code=201)
async def initiate_payment(
    body: PaymentInitiateRequest,
    user: dict = Depends(require_tenant),
    conn: Connection = Depends(get_db),
):
    lease = await conn.fetchrow(
        'SELECT id, "tenantId" FROM lease WHERE id = $1',
        body.lease_id,
    )
    if lease is None:
        raise HTTPException(status_code=404, detail="Lease not found")
    if lease["tenantId"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    payment_id = str(uuid.uuid4())
    row = await conn.fetchrow(
        """
        INSERT INTO payment (id, "leaseId", "payerId", "amountPesewas", status, "createdAt")
        VALUES ($1, $2, $3, $4, 'pending', NOW())
        RETURNING id, "leaseId", "payerId", "amountPesewas", "hubtelReference",
                  status, "paidAt", "createdAt"
        """,
        payment_id,
        body.lease_id,
        user["id"],
        body.amount_pesewas,
    )

    hubtel_ref = await _hubtel.receive_money(
        amount_pesewas=body.amount_pesewas,
        phone_number=body.phone_number,
        description=f"Rent payment for lease {body.lease_id}",
    )

    row = await conn.fetchrow(
        """
        UPDATE payment SET "hubtelReference" = $1 WHERE id = $2
        RETURNING id, "leaseId", "payerId", "amountPesewas", "hubtelReference",
                  status, "paidAt", "createdAt"
        """,
        hubtel_ref,
        payment_id,
    )
    return _row_to_payment(row)


@router.post("/webhook", status_code=200)
async def payment_webhook(
    payload: HubtelWebhookPayload,
    conn: Connection = Depends(get_db),
):
    # TODO: validate Hubtel webhook signature when Hubtel provides one.

    payment = await conn.fetchrow(
        """
        SELECT id, "leaseId", "payerId", "amountPesewas", "hubtelReference"
        FROM payment
        WHERE "hubtelReference" = $1
        """,
        payload.ClientReference,
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payload.Status == "Success":
        await conn.execute(
            'UPDATE payment SET status = \'paid\', "paidAt" = NOW() WHERE id = $1',
            payment["id"],
        )

        lease = await conn.fetchrow(
            'SELECT "landlordId" FROM lease WHERE id = $1',
            payment["leaseId"],
        )

        await conn.execute(
            """
            INSERT INTO escrow_ledger (
                id, "leaseId", "fromUserId", "toUserId", "amountPesewas",
                "entryType", "hubtelReference", description, "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, 'escrow_deposit', $6, $7, NOW())
            """,
            str(uuid.uuid4()),
            payment["leaseId"],
            payment["payerId"],
            lease["landlordId"],
            payment["amountPesewas"],
            payment["hubtelReference"],
            f"Escrow deposit for lease {payment['leaseId']}",
        )
    else:
        await conn.execute(
            "UPDATE payment SET status = 'failed' WHERE id = $1",
            payment["id"],
        )

    return {"ok": True}


@router.get("", response_model=list[PaymentOut])
async def list_payments(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if user["role"] == "tenant":
        rows = await conn.fetch(
            _SELECT_PAYMENT + 'WHERE "payerId" = $1 ORDER BY "createdAt" DESC',
            user["id"],
        )
    elif user["role"] == "landlord":
        rows = await conn.fetch(
            """
            SELECT p.id, p."leaseId", p."payerId", p."amountPesewas",
                   p."hubtelReference", p.status, p."paidAt", p."createdAt"
            FROM payment p
            JOIN lease l ON l.id = p."leaseId"
            WHERE l."landlordId" = $1
            ORDER BY p."createdAt" DESC
            """,
            user["id"],
        )
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    return [_row_to_payment(r) for r in rows]


@escrow_router.get("/ledger", response_model=list[EscrowEntryOut])
async def get_escrow_ledger(
    lease_id: str | None = Query(default=None),
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
):
    if lease_id is not None:
        rows = await conn.fetch(
            _SELECT_ESCROW
            + 'WHERE (l."tenantId" = $1 OR l."landlordId" = $1) AND el."leaseId" = $2'
            + ' ORDER BY el."createdAt" DESC',
            user["id"],
            lease_id,
        )
    else:
        rows = await conn.fetch(
            _SELECT_ESCROW
            + 'WHERE (l."tenantId" = $1 OR l."landlordId" = $1)'
            + ' ORDER BY el."createdAt" DESC',
            user["id"],
        )

    return [_row_to_escrow(r) for r in rows]
