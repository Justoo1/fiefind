from datetime import date, datetime

from pydantic import BaseModel, Field


class ServiceBookingCreate(BaseModel):
    provider_id: str
    title: str
    category: str
    description: str | None = None
    property_id: str | None = None
    scheduled_for: date | None = None


class ServiceBookingRespond(BaseModel):
    accept: bool
    agreed_price_pesewas: int | None = Field(default=None, gt=0)


class ServiceBookingStatusUpdate(BaseModel):
    status: str


class ServiceBookingOut(BaseModel):
    id: str
    requester_id: str
    provider_id: str
    property_id: str | None
    title: str
    category: str
    description: str | None
    status: str
    agreed_price_pesewas: int | None
    scheduled_for: datetime | None
    created_at: datetime
    updated_at: datetime
    requester_name: str | None = None
    provider_name: str | None = None
