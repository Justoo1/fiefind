import asyncpg
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

from app.config import settings

pool: asyncpg.Pool | None = None


def _build_dsn(raw_url: str) -> str:
    """Strip asyncpg-incompatible Neon params, preserve sslmode."""
    parsed = urlparse(raw_url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    # asyncpg understands sslmode but not channel_binding
    params.pop("channel_binding", None)
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=clean_query))


async def init_pool() -> None:
    global pool
    dsn = _build_dsn(settings.DATABASE_URL)
    pool = await asyncpg.create_pool(dsn=dsn, ssl="require", min_size=2, max_size=10)


async def close_pool() -> None:
    global pool
    if pool:
        await pool.close()
        pool = None


async def get_db():
    """FastAPI dependency — yields a connection from the pool."""
    async with pool.acquire() as conn:
        yield conn
