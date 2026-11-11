"""User management endpoints (admin only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.errors import ApiError
from app.core.security import hash_password
from app.models import User
from app.schemas.auth import UserCreate, UserRead, UserUpdate
from app.schemas.common import Page

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=Page[UserRead])
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    q: str | None = Query(default=None),
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Page[UserRead]:
    conditions = []
    if q:
        term = f"%{q.strip()}%"
        conditions.append(or_(User.name.ilike(term), User.email.ilike(term)))

    total = await db.scalar(
        select(func.count(User.id)).where(*conditions)
    )
    users = (
        await db.scalars(
            select(User)
            .where(*conditions)
            .order_by(User.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[UserRead.model_validate(user) for user in users],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserRead)
async def create_user(
    payload: UserCreate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    email = payload.email.lower()
    exists = await db.scalar(select(User.id).where(func.lower(User.email) == email))
    if exists is not None:
        raise ApiError(409, "A user with this email already exists.", "email_exists")

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await db.get(User, user_id)
    if user is None:
        raise ApiError(404, "User not found.", "user_not_found")

    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"] is not None:
        email = str(data["email"]).lower()
        duplicate = await db.scalar(
            select(User.id).where(
                func.lower(User.email) == email, User.id != user.id
            )
        )
        if duplicate is not None:
            raise ApiError(
                409, "A user with this email already exists.", "email_exists"
            )
        data["email"] = email

    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserRead.model_validate(user)
