from contextlib import asynccontextmanager

from fastapi import FastAPI, Security
from fastapi.security import APIKeyHeader

from app import db
from app.middleware.auth import InternalSecretMiddleware
from app.routers import applications, documents, health, kyc, leases, maintenance, payments, properties, service_providers

# Declared as security schemes so Swagger UI shows an Authorize dialog.
# Fill them in once and every "Try it out" request will include the headers.
# auto_error=False — actual validation is still done by middleware/dependencies.
_secret_scheme = APIKeyHeader(name="X-Internal-Secret", scheme_name="InternalSecret", auto_error=False)
_user_id_scheme = APIKeyHeader(name="X-User-Id", scheme_name="UserId", auto_error=False)
_user_role_scheme = APIKeyHeader(name="X-User-Role", scheme_name="UserRole", auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    yield
    await db.close_pool()


app = FastAPI(
    title="FieFind Backend",
    lifespan=lifespan,
    dependencies=[
        Security(_secret_scheme),
        Security(_user_id_scheme),
        Security(_user_role_scheme),
    ],
)

app.add_middleware(InternalSecretMiddleware)
app.include_router(health.router)
app.include_router(properties.router, prefix="/properties", tags=["properties"])
app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(leases.router, prefix="/leases", tags=["leases"])
app.include_router(kyc.router, prefix="/kyc", tags=["kyc"])
app.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(payments.escrow_router, prefix="/escrow", tags=["escrow"])
app.include_router(documents.router, tags=["documents"])
app.include_router(service_providers.router, prefix="/service-providers", tags=["service-providers"])
