"""Expense endpoints: money paid out of the main ABA account."""

from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import ApiError
from app.models import Expense, User
from app.schemas.common import Page
from app.schemas.expenses import ExpenseCreate, ExpenseRead
from app.services.utils import add_activity

router = APIRouter(prefix="/expenses", tags=["expenses"])


async def _load_expense(db: AsyncSession, expense_id: UUID) -> Expense:
    expense = await db.scalar(select(Expense).where(Expense.id == expense_id))
    if expense is None:
        raise ApiError(404, "Expense not found.", "expense_not_found")
    return expense


@router.get("", response_model=Page[ExpenseRead])
async def list_expenses(
    from_value: str | None = Query(default=None, alias="from"),
    to_value: str | None = Query(default=None, alias="to"),
    category: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[ExpenseRead]:
    conditions = []
    if from_value:
        try:
            start = date.fromisoformat(from_value)
        except ValueError as exc:
            raise ApiError(400, "Invalid 'from' date.", "invalid_date") from exc
        conditions.append(Expense.business_date >= start)
    if to_value:
        try:
            end = date.fromisoformat(to_value)
        except ValueError as exc:
            raise ApiError(400, "Invalid 'to' date.", "invalid_date") from exc
        conditions.append(Expense.business_date <= end)
    if category:
        if category not in {"restock", "supplies", "utility", "other"}:
            raise ApiError(400, "Invalid expense category.", "invalid_category")
        conditions.append(Expense.category == category)

    base = select(Expense)
    if conditions:
        base = base.where(*conditions)
    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    sum_total = await db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).select_from(
            base.subquery()
        )
    )
    rows = await db.scalars(
        base.order_by(Expense.business_date.desc(), Expense.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return Page(
        items=[ExpenseRead.model_validate(row) for row in rows.all()],
        total=total or 0,
        page=page,
        page_size=page_size,
        sum=int(sum_total or 0),
    )


@router.get("/today")
async def today_expenses(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str | int]:
    today = datetime.now(UTC).date()
    total = await db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.business_date == today
        )
    )
    return {"date": today.isoformat(), "total": int(total or 0)}


@router.post("", response_model=ExpenseRead)
async def create_expense(
    payload: ExpenseCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExpenseRead:
    if payload.business_date > datetime.now(UTC).date():
        raise ApiError(
            400, "Expenses cannot be dated in the future.", "invalid_date"
        )
    expense = Expense(
        business_date=payload.business_date,
        category=payload.category,
        description=payload.description.strip(),
        amount=payload.amount,
        created_by_id=user.id,
    )
    db.add(expense)
    add_activity(
        db,
        activity_type="expense",
        message=(
            f"Expense recorded: {payload.description.strip()} "
            f"for {payload.amount:,} KHR."
        ),
        actor=user,
        entity_type="expense",
        entity_id=payload.description.strip(),
        created_at=datetime.now(UTC),
    )
    await db.commit()
    await db.refresh(expense)
    return ExpenseRead.model_validate(expense)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    expense = await _load_expense(db, expense_id)
    await db.delete(expense)
    add_activity(
        db,
        activity_type="expense",
        message=(
            f"Expense deleted: {expense.description} "
            f"({expense.amount:,} KHR)."
        ),
        actor=admin,
        entity_type="expense",
        entity_id=expense.description,
    )
    await db.commit()
