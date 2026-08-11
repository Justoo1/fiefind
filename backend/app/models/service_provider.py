from pydantic import BaseModel


class ServiceProviderOut(BaseModel):
    id: str
    name: str
    phone: str | None
    specialty: str | None
    avg_rating: float | None = None
    review_count: int = 0


class AssignArtisanRequest(BaseModel):
    artisan_id: str
