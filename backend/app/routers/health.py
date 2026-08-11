from fastapi import APIRouter

import app.db as db

router = APIRouter()


@router.get("/health")
async def health_check():
    db_ok = False
    try:
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
            db_ok = True
    except Exception:
        pass
    return {"status": "ok", "db": db_ok}
