from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MaintenanceTicketCreate(BaseModel):
    property_id: str
    lease_id: str | None = None
    title: str
    category: str
    description: str | None = None


class MaintenanceTicketStatusUpdate(BaseModel):
    status: Literal["open", "scheduled", "in_progress", "completed"]


class MaintenanceTicketOut(BaseModel):
    id: str
    property_id: str
    lease_id: str | None
    tenant_id: str
    title: str
    category: str
    description: str | None
    artisan_id: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    # Populated via JOINs with user + property tables
    tenant_name: str | None = None
    property_title: str | None = None
    property_area: str | None = None
    artisan_name: str | None = None
