import hmac

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

EXEMPT_PATHS = {"/health", "/docs", "/redoc", "/openapi.json", "/kyc/webhook", "/payments/webhook"}


class InternalSecretMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        secret = request.headers.get("X-Internal-Secret", "")
        if not hmac.compare_digest(secret, settings.INTERNAL_API_SECRET):
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        return await call_next(request)
