from datetime import datetime

from pydantic import BaseModel, Field


class PaymentInitiateRequest(BaseModel):
    lease_id: str
    amount_pesewas: int = Field(..., gt=0)
    phone_number: str


class PaymentOut(BaseModel):
    id: str
    lease_id: str | None
    payer_id: str
    amount_pesewas: int
    hubtel_reference: str | None
    status: str  # "pending" | "paid" | "failed"
    paid_at: datetime | None
    created_at: datetime


class HubtelWebhookPayload(BaseModel):
    ClientReference: str  # maps to hubtelReference in DB
    Status: str           # "Success" | "Failed"
    TransactionId: str | None = None


class EscrowEntryOut(BaseModel):
    id: str
    lease_id: str | None
    from_user_id: str
    to_user_id: str
    amount_pesewas: int
    entry_type: str  # ledger_entry_type enum values
    hubtel_reference: str | None
    description: str | None
    created_at: datetime
