from pydantic import BaseModel


class ServiceProviderOut(BaseModel):
    id: str
    name: str
    phone: str | None
    specialty: str | None


class AssignArtisanRequest(BaseModel):
    artisan_id: str
