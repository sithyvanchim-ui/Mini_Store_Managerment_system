"""Fund request endpoints: money requested from the main ABA account."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import ApiError
from app.models import FundRequest, User
from app.schemas.common import Page
from app.schemas.fund_requests import (
    FundRequestCreate,
    FundRequestRead,
    FundReviewPayload,
)
from app.services.utils import add_activity, generate_reference

router = APIRouter(prefix="/fund-requests", tags=["fund-requests"])

_ALLOWED_STATUS = {"pending", "approved", "rejected", "disbursed"}


async def _load_request(db: AsyncSession, fund_request_id: UUID) -> FundRequest:
    fund_request = await db.scalar(
        select(FundRequest).where(FundRequest.id == fund_request_id)
    )
    if fund_request is None:
        raise ApiError(404, "Fund request not found.", "fund_request_not_found")
    return fund_request


@router.get("", response_model=Page[FundRequestRead])
async def list_fund_requests(
    status: str | None = Query(default=None),
    mine: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[FundRequestRead]:
    conditions = []
    if status:
        if status not in _ALLOWED_STATUS:
            raise ApiError(400, "Invalid fund request status.", "invalid_status")
        conditions.append(FundRequest.status == status)
    # Staff only see their own requests unless the admin shares everything.
    if user.role != "admin":
        conditions.append(FundRequest.requested_by_id == user.id)
    elif mine:
        conditions.append(FundRequest.requested_by_id == user.id)

    base = select(FundRequest)
    if conditions:
        base = base.where(*conditions)
    total = await db.scalar(
        select(func.count()).select_from(base.subquery())
    )
    rows = await db.scalars(
        base.order_by(FundRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return Page(
        items=[FundRequestRead.model_validate(row) for row in rows.all()],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.get("/pending-count")
async def pending_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    count = await db.scalar(
        select(func.count()).select_from(FundRequest).where(
            FundRequest.status == "pending"
        )
    )
    return {"pending": int(count or 0)}


@router.post("", response_model=FundRequestRead)
async def create_fund_request(
    payload: FundRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FundRequestRead:
    now = datetime.now(UTC)
    reference = await generate_reference(
        db, FundRequest, FundRequest.created_at, "FR", now
    )
    fund_request = FundRequest(
        reference=reference,
        amount=payload.amount,
        purpose=payload.purpose.strip(),
        note=payload.note,
        status="pending",
        requested_by_id=user.id,
        created_at=now,
    )
    db.add(fund_request)
    add_activity(
        db,
        activity_type="fund_request",
        message=(
            f"Fund request {reference} for {payload.amount:,} KHR "
            f"submitted ({payload.purpose.strip()})."
        ),
        actor=user,
        entity_type="fund_request",
        entity_id=reference,
        created_at=now,
    )
    await db.commit()
    await db.refresh(fund_request)
    return FundRequestRead.model_validate(fund_request)


@router.post("/{fund_request_id}/review", response_model=FundRequestRead)
async def review_fund_request(
    fund_request_id: UUID,
    payload: FundReviewPayload,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FundRequestRead:
    fund_request = await _load_request(db, fund_request_id)
    if fund_request.status != "pending":
        raise ApiError(
            409,
            "Only pending fund requests can be reviewed.",
            "fund_request_not_pending",
        )
    now = datetime.now(UTC)
    fund_request.status = payload.decision
    fund_request.decision_note = payload.note
    fund_request.reviewed_by_id = admin.id
    fund_request.reviewed_at = now
    add_activity(
        db,
        activity_type="fund_request",
        message=(
            f"Fund request {fund_request.reference} was {payload.decision} "
            f"by {admin.name}."
        ),
        actor=admin,
        entity_type="fund_request",
        entity_id=fund_request.reference,
        created_at=now,
    )
    await db.commit()
    await db.refresh(fund_request)
    return FundRequestRead.model_validate(fund_request)


@router.post("/{fund_request_id}/disburse", response_model=FundRequestRead)
async def disburse_fund_request(
    fund_request_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> FundRequestRead:
    fund_request = await _load_request(db, fund_request_id)
    if fund_request.status != "approved":
        raise ApiError(
            409,
            "Only approved fund requests can be disbursed.",
            "fund_request_not_approved",
        )
    now = datetime.now(UTC)
    fund_request.status = "disbursed"
    fund_request.reviewed_by_id = admin.id
    fund_request.reviewed_at = now
    add_activity(
        db,
        activity_type="fund_request",
        message=(
            f"Fund request {fund_request.reference} disbursed "
            f"({fund_request.amount:,} KHR from the main account)."
        ),
        actor=admin,
        entity_type="fund_request",
        entity_id=fund_request.reference,
        created_at=now,
    )
    await db.commit()
    await db.refresh(fund_request)
    return FundRequestRead.model_validate(fund_request)
