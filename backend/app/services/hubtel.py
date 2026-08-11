import uuid


class HubtelClient:
    """
    Hubtel mobile money client.

    Runs in stub mode when HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET are unset.
    Stub returns a fake reference immediately so the full payment flow can be
    exercised end-to-end without real credentials.

    Real implementation: replace the body of receive_money() with an HTTP call
    to the Hubtel Receive Money API using client_id / client_secret as Basic Auth
    and account_number as the merchant account. Set callback_url to the public
    URL of POST /payments/webhook so Hubtel can confirm payment status.
    Validate incoming webhooks with an HMAC signature check when Hubtel provides one.
    """

    def __init__(
        self,
        client_id: str | None,
        client_secret: str | None,
        account_number: str | None,
        callback_url: str | None,
    ):
        self._client_id = client_id
        self._client_secret = client_secret
        self._account_number = account_number
        self._callback_url = callback_url
        self.stub = not (client_id and client_secret)

    async def receive_money(
        self,
        amount_pesewas: int,
        phone_number: str,
        description: str,
    ) -> str:
        """Initiate a mobile money debit. Returns the Hubtel ClientReference."""
        if self.stub:
            return f"stub_{uuid.uuid4()}"
        # TODO: replace with real Hubtel Receive Money API call
        raise NotImplementedError("Real Hubtel credentials not configured")


def make_hubtel_client(
    client_id: str | None,
    client_secret: str | None,
    account_number: str | None,
    callback_url: str | None,
) -> HubtelClient:
    return HubtelClient(client_id, client_secret, account_number, callback_url)
