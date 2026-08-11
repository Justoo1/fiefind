from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

PropertyType = Literal["apartment", "house", "studio", "townhouse"]
ListingStatus = Literal["live", "occupied", "draft"]


class PropertyCreate(BaseModel):
    title: str = Field(..., max_length=200)
    type: PropertyType
    area: str
    region: str
    beds: int = Field(..., ge=1)
    baths: int = Field(..., ge=1)
    sqft: int | None = None
    rent_pesewas: int = Field(..., gt=0)
    advance_months: int = Field(6, ge=1, le=12)
    description: str | None = None
    amenities: list[str] = []
    status: ListingStatus = "draft"
    ghana_post_gps: str | None = None
    street_address: str | None = None
    pin_x: float | None = None
    pin_y: float | None = None


class PropertyUpdate(BaseModel):
    title: str = Field(..., max_length=200)
    type: PropertyType
    area: str
    region: str
    beds: int = Field(..., ge=1)
    baths: int = Field(..., ge=1)
    sqft: int | None = None
    rent_pesewas: int = Field(..., gt=0)
    advance_months: int = Field(6, ge=1, le=12)
    description: str | None = None
    amenities: list[str] = []
    status: ListingStatus = "draft"
    ghana_post_gps: str | None = None
    street_address: str | None = None
    pin_x: float | None = None
    pin_y: float | None = None


class PropertyOut(BaseModel):
    id: str
    landlord_id: str
    landlord_name: str | None = None
    title: str
    type: str
    area: str
    region: str
    beds: int
    baths: int
    sqft: int | None
    rent_pesewas: int
    advance_months: int
    description: str | None
    amenities: list[str]
    status: str
    ghana_post_gps: str | None = None
    street_address: str | None = None
    pin_x: float | None
    pin_y: float | None
    created_at: datetime
    updated_at: datetime
