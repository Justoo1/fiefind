from datetime import datetime

from pydantic import BaseModel


class ServicePaymentInitiateRequest(BaseModel):
    phone_number: str


class ServicePaymentOut(BaseModel):
    id: str
    service_booking_id: str
    payer_id: str
    amount_pesewas: int
    platform_fee_pesewas: int
    provider_payout_pesewas: int
    hubtel_reference: str | None
    status: str
    paid_at: datetime | None
    created_at: datetime
