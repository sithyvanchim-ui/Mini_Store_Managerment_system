"""Payment QR endpoints.

Builds a KHQR string for the exact amount of a pending sale so the buyer can
scan it with any participating bank app (ABA, ACLEDA, and other KHQR members).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import AppSettings, User
from app.services.khqr import build_khqr

router = APIRouter(prefix="/payments", tags=["payments"])


class KhqrResponse(BaseModel):
    qr: str


@router.get("/khqr", response_model=KhqrResponse)
async def khqr_for_amount(
    amount: int = Query(gt=0, le=10_000_000_000),
    reference: str | None = Query(default=None, max_length=40),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KhqrResponse:
    settings_row = await db.scalar(select(AppSettings).limit(1))
    if settings_row is None:
        settings_row = AppSettings()
        db.add(settings_row)
        await db.flush()
    template = settings_row.khqr_data
    if not template:
        raise HTTPException(
            status_code=409,
            detail="No KHQR account configured. An admin must set it in Settings.",
        )
    try:
        qr = build_khqr(
            template=template,
            account_id=None,
            amount=amount,
            currency=settings_row.currency,
            reference=reference,
            merchant_name=settings_row.store_name,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return KhqrResponse(qr=qr)
