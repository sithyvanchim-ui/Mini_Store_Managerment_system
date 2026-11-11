"""Application settings endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import AppSettings, User
from app.schemas.settings import AppSettingsRead, AppSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


async def load_settings(db: AsyncSession) -> AppSettings:
    existing = await db.scalar(select(AppSettings).limit(1))
    if existing is None:
        existing = AppSettings()
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
    return existing


@router.get("", response_model=AppSettingsRead)
async def get_settings(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AppSettingsRead:
    return AppSettingsRead.model_validate(await load_settings(db))


@router.patch("", response_model=AppSettingsRead)
async def update_settings(
    payload: AppSettingsUpdate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> AppSettingsRead:
    settings_row = await load_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(settings_row, field, value)
    await db.commit()
    await db.refresh(settings_row)
    return AppSettingsRead.model_validate(settings_row)
