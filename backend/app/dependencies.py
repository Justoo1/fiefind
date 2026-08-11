from fastapi import Depends, Header, HTTPException


async def get_current_user(
    x_user_id: str = Header(...),
    x_user_role: str = Header(...),
) -> dict:
    return {"id": x_user_id, "role": x_user_role}


async def require_landlord(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "landlord":
        raise HTTPException(status_code=403, detail="Landlord role required")
    return user


async def require_tenant(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "tenant":
        raise HTTPException(status_code=403, detail="Tenant role required")
    return user
