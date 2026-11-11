"""Supplier endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import ApiError
from app.models import Purchase, Supplier, User
from app.schemas.common import Page
from app.schemas.suppliers import SupplierCreate, SupplierRead, SupplierUpdate
from app.services.utils import add_activity

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=Page[SupplierRead])
async def list_suppliers(
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[SupplierRead]:
    conditions = []
    if q:
        term = f"%{q.strip()}%"
        conditions.append(
            or_(
                Supplier.name.ilike(term),
                Supplier.contact_name.ilike(term),
                Supplier.phone.ilike(term),
            )
        )

    total = await db.scalar(select(func.count(Supplier.id)).where(*conditions))
    suppliers = (
        await db.scalars(
            select(Supplier)
            .where(*conditions)
            .order_by(Supplier.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[SupplierRead.model_validate(supplier) for supplier in suppliers],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SupplierRead)
async def create_supplier(
    payload: SupplierCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupplierRead:
    name = payload.name.strip()
    exists = await db.scalar(
        select(Supplier.id).where(func.lower(Supplier.name) == name.lower())
    )
    if exists is not None:
        raise ApiError(409, "A supplier with this name already exists.", "duplicate_name")

    supplier = Supplier(
        name=name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
        address=payload.address,
        notes=payload.notes,
    )
    db.add(supplier)
    await db.flush()
    add_activity(
        db,
        activity_type="supplier",
        message=f"Supplier {name} created.",
        actor=user,
        entity_type="supplier",
        entity_id=str(supplier.id),
    )
    await db.commit()
    await db.refresh(supplier)
    return SupplierRead.model_validate(supplier)


@router.patch("/{supplier_id}", response_model=SupplierRead)
async def update_supplier(
    supplier_id: UUID,
    payload: SupplierUpdate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SupplierRead:
    supplier = await db.get(Supplier, supplier_id)
    if supplier is None:
        raise ApiError(404, "Supplier not found.", "supplier_not_found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        duplicate = await db.scalar(
            select(Supplier.id).where(
                func.lower(Supplier.name) == name.lower(),
                Supplier.id != supplier.id,
            )
        )
        if duplicate is not None:
            raise ApiError(
                409, "A supplier with this name already exists.", "duplicate_name"
            )
        data["name"] = name
    if "email" in data and data["email"] is not None:
        data["email"] = str(data["email"])

    for field, value in data.items():
        setattr(supplier, field, value)
    await db.commit()
    await db.refresh(supplier)
    return SupplierRead.model_validate(supplier)


@router.delete("/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    supplier = await db.get(Supplier, supplier_id)
    if supplier is None:
        raise ApiError(404, "Supplier not found.", "supplier_not_found")

    purchase_count = await db.scalar(
        select(func.count(Purchase.id)).where(Purchase.supplier_id == supplier.id)
    )
    if purchase_count:
        raise ApiError(
            409,
            "Cannot deactivate a supplier referenced by purchases.",
            "supplier_in_use",
        )

    supplier.is_active = False
    add_activity(
        db,
        activity_type="supplier",
        message=f"Supplier {supplier.name} deactivated.",
        actor=admin,
        entity_type="supplier",
        entity_id=str(supplier.id),
    )
    await db.commit()
    return Response(status_code=204)
