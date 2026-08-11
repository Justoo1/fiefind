from datetime import datetime

from pydantic import BaseModel, Field


class ServiceReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class ServiceReviewOut(BaseModel):
    id: str
    booking_id: str
    provider_id: str
    reviewer_id: str
    rating: int
    comment: str | None
    created_at: datetime
