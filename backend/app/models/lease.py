from datetime import date, datetime

from pydantic import BaseModel, Field


class LeaseCreate(BaseModel):
    property_id: str
    tenant_id: str
    rent_pesewas: int = Field(..., gt=0)
    start_date: date
    end_date: date
    next_due_date: date | None = None


class LeaseOut(BaseModel):
    id: str
    property_id: str
    tenant_id: str
    landlord_id: str
    rent_pesewas: int
    start_date: date
    end_date: date
    next_due_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime
    # Populated only in landlord-role responses (JOIN with user + property)
    tenant_name: str | None = None
    property_title: str | None = None
    property_area: str | None = None
