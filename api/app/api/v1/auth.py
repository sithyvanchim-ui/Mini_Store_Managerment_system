"""Authentication endpoints."""

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    UserRead,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    email = payload.email.lower()
    user = await db.scalar(
        select(User).where(func.lower(User.email) == email)
    )
    if user is None or not user.is_active or not verify_password(
        payload.password, user.password_hash
    ):
        raise ApiError(401, "Invalid email or password.", "invalid_credentials")

    token = create_access_token(str(user.id), user.role)
    _set_auth_cookie(response, token)
    return LoginResponse(user=UserRead.model_validate(user))


@router.post("/logout", status_code=204)
async def logout() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        httponly=True,
    )
    return response


@router.get("/me", response_model=LoginResponse)
async def me(user: User = Depends(get_current_user)) -> LoginResponse:
    return LoginResponse(user=UserRead.model_validate(user))


@router.post("/change-password", status_code=204)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    if not verify_password(payload.current_password, user.password_hash):
        raise ApiError(400, "Current password is incorrect.", "invalid_password")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return Response(status_code=204)
