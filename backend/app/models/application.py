from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ApplicationOut(BaseModel):
    id: str
    property_id: str
    tenant_id: str
    status: str
    bg_check_status: str | None
    applied_at: datetime
    updated_at: datetime
    # Populated in landlord responses
    tenant_name: str | None = None
    # Populated in both landlord and tenant responses (JOIN with property)
    property_title: str | None = None
    property_area: str | None = None
    property_rent_pesewas: int | None = None
    landlord_name: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: Literal["approved", "declined"]
