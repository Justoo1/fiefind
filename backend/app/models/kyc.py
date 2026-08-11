from datetime import datetime

from pydantic import BaseModel


class KycInitiateRequest(BaseModel):
    ghana_card_number: str
    id_image_base64: str
    selfie_image_base64: str


class KycStatusOut(BaseModel):
    id: str | None = None
    user_id: str
    # "not_started" when no record exists yet
    status: str
    smile_job_id: str | None = None
    ghana_card_number: str | None = None
    verified_at: datetime | None = None
    failure_reason: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class KycWebhookPayload(BaseModel):
    # Smile ID DocVV webhook body (PascalCase as sent by Smile ID)
    SmileJobID: str
    ResultCode: str   # "0810" = Passed; anything else = Failed
    ResultText: str
