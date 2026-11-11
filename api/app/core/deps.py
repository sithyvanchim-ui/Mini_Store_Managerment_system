"""Authentication dependencies."""

from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import decode_access_token
from app.models import User


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get(settings.cookie_name)
    if not token:
        raise ApiError(401, "Not authenticated.", "not_authenticated")

    try:
        payload = decode_access_token(token)
        user_id = UUID(str(payload.get("sub")))
    except Exception as exc:
        raise ApiError(401, "Invalid or expired session.", "invalid_token") from exc

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise ApiError(401, "Invalid or inactive user.", "invalid_token")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise ApiError(403, "Administrator access required.", "forbidden")
    return user
