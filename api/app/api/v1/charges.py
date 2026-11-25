"""ABA charge endpoints — charge a product against the shop's ABA wallet."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin, require_staff
from app.models import AppSettings, User
from app.schemas.charges import ChargeCreate, ChargeListResponse, ChargeRead
from app.services.charges import charge_list, charge_read_model, create_charge
from app.services.khqr import build_khqr

router = APIRouter(prefix="/charges", tags=["charges"])


@router.post("", response_model=ChargeRead, status_code=201)
async def charge_product(
    payload: ChargeCreate,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ChargeRead:
    """Create a pending charge for a product using its selling price."""

    settings_row = await db.scalar(select(AppSettings).limit(1))
    if settings_row is None:
        settings_row = AppSettings()
        db.add(settings_row)
        await db.flush()
    if not settings_row.khqr_data:
        raise HTTPException(
            status_code=409,
            detail="No KHQR account configured. An admin must set it in Settings.",
        )

    charge = await create_charge(db, payload=payload, user=user)
    await db.flush()
    data = await charge_read_model(db, charge)

    try:
        qr = build_khqr(
            template=settings_row.khqr_data,
            account_id=None,
            amount=data.amount,
            reference=data.reference,
            currency=settings_row.currency,
            merchant_name=settings_row.store_name,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    data.qr = qr
    await db.commit()
    data = await charge_read_model(db, charge)
    data.qr = qr
    return data


@router.get("", response_model=ChargeListResponse)
async def list_charges(
    page: int = 1,
    page_size: int = 20,
    _user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> ChargeListResponse:
    items, total = await charge_list(db, page=page, page_size=page_size)
    return ChargeListResponse(
        items=[await charge_read_model(db, item) for item in items],
        total=total,
    )
