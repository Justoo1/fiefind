import uuid


class SmileIdClient:
    """
    Smile ID DocVV + SmartSelfie client.

    Runs in stub mode when SMILE_ID_PARTNER_ID / SMILE_ID_API_KEY are unset.
    Stub returns a fake job ID immediately so the rest of the flow can be
    exercised end-to-end without real credentials.

    Real implementation: replace the body of submit_docvv() with an HTTP call
    to https://testapi.smileidentity.com/v1/smile_identity (sandbox) or
    https://api.smileidentity.com/v1/smile_identity (production).
    Validate incoming webhooks with HMAC-SHA256 using SMILE_ID_WEBHOOK_SECRET.
    """

    def __init__(self, partner_id: str | None, api_key: str | None):
        self._partner_id = partner_id
        self._api_key = api_key
        self.stub = not (partner_id and api_key)

    async def submit_docvv(
        self,
        user_id: str,
        ghana_card_number: str,
        id_image_base64: str,
        selfie_image_base64: str,
    ) -> str:
        """Submit a DocVV + SmartSelfie job. Returns the Smile ID job ID."""
        if self.stub:
            return f"stub_{uuid.uuid4()}"
        # TODO: replace with real Smile ID HTTP call
        raise NotImplementedError("Real Smile ID credentials not configured")


def make_smile_id_client(partner_id: str | None, api_key: str | None) -> SmileIdClient:
    return SmileIdClient(partner_id, api_key)
