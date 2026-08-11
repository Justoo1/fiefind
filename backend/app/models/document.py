from datetime import datetime

from pydantic import BaseModel


class DocumentUploadRequest(BaseModel):
    title: str
    lease_id: str | None = None
    file_name: str  # used to derive file extension for the R2 key


class CreateDigitalDocRequest(BaseModel):
    title: str
    clauses: list[str] = []
    lease_id: str | None = None


class DocumentOut(BaseModel):
    id: str
    property_id: str
    lease_id: str | None
    title: str
    storage_key: str | None
    download_url: str | None  # public_base + "/" + storage_key, None until upload
    landlord_signed: bool
    tenant_signed: bool
    is_digital: bool
    clauses: list[str]
    uploaded_at: datetime


class UploadUrlResponse(BaseModel):
    url: str  # presigned PUT URL — client uploads directly to R2
    document: DocumentOut
