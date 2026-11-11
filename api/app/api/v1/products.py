"""Product and stock-adjustment endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.models import Category, Product, User
from app.schemas.common import Page
from app.schemas.products import (
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StockAdjustRequest,
)
from app.services.stock import add_stock_movement
from app.services.utils import add_activity, manual_reference

router = APIRouter(prefix="/products", tags=["products"])


def _normalize_code(code: str) -> str:
    return code.strip().upper()


async def _get_product(db: AsyncSession, product_id: UUID) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise ApiError(404, "Product not found.", "product_not_found")
    return product


@router.get("", response_model=Page[ProductRead])
async def list_products(
    q: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    location: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
    sort: str = Query(default="name"),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[ProductRead]:
    conditions = []
    if q:
        term = f"%{q.strip()}%"
        conditions.append(or_(Product.name.ilike(term), Product.code.ilike(term)))
    if category_id:
        conditions.append(Product.category_id == category_id)
    if location:
        if location not in {"fridge", "shelf"}:
            raise ApiError(400, "Invalid location filter.", "invalid_location")
        conditions.append(Product.location == location)
    if status:
        if status == "out_of_stock":
            conditions.append(Product.stock_qty <= 0)
        elif status == "low_stock":
            conditions.append(
                (Product.stock_qty > 0)
                & (Product.stock_qty <= Product.low_stock_threshold)
            )
        elif status == "in_stock":
            conditions.append(Product.stock_qty > Product.low_stock_threshold)
        else:
            raise ApiError(400, "Invalid stock status filter.", "invalid_status")

    total = await db.scalar(select(func.count(Product.id)).where(*conditions))

    sort_map = {
        "name": Product.name,
        "code": Product.code,
        "stock": Product.stock_qty,
        "stock_qty": Product.stock_qty,
        "price": Product.selling_price,
        "selling_price": Product.selling_price,
        "created_at": Product.created_at,
    }
    descending = sort.startswith("-")
    sort_field = sort_map.get(sort.lstrip("-"), Product.name)
    order = sort_field.desc() if descending else sort_field.asc()

    products = (
        await db.scalars(
            select(Product)
            .where(*conditions)
            .order_by(order, Product.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[ProductRead.model_validate(product) for product in products],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: UUID,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProductRead:
    return ProductRead.model_validate(await _get_product(db, product_id))


@router.post("", response_model=ProductRead)
async def create_product(
    payload: ProductCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProductRead:
    category = await db.get(Category, payload.category_id)
    if category is None:
        raise ApiError(404, "Category not found.", "category_not_found")

    code = _normalize_code(payload.code)
    exists = await db.scalar(select(Product.id).where(Product.code == code))
    if exists is not None:
        raise ApiError(409, "A product with this code already exists.", "duplicate_code")

    product = Product(
        code=code,
        name=payload.name.strip(),
        category_id=category.id,
        package=payload.package.strip(),
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        stock_qty=payload.stock_qty,
        low_stock_threshold=payload.low_stock_threshold,
        location=payload.location,
        slot_code=payload.slot_code,
        is_active=payload.is_active,
        category=category,
    )
    db.add(product)
    await db.flush()
    add_activity(
        db,
        activity_type="product",
        message=f"Product {product.name} ({code}) created.",
        actor=user,
        entity_type="product",
        entity_id=str(product.id),
    )
    await db.commit()
    refreshed = await _get_product(db, product.id)
    return ProductRead.model_validate(refreshed)


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProductRead:
    product = await _get_product(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data and data["category_id"] is not None:
        category = await db.get(Category, data["category_id"])
        if category is None:
            raise ApiError(404, "Category not found.", "category_not_found")
        product.category = category

    if "code" in data and data["code"] is not None:
        code = _normalize_code(str(data["code"]))
        duplicate = await db.scalar(
            select(Product.id).where(Product.code == code, Product.id != product.id)
        )
        if duplicate is not None:
            raise ApiError(
                409, "A product with this code already exists.", "duplicate_code"
            )
        data["code"] = code

    if "name" in data and data["name"] is not None:
        data["name"] = str(data["name"]).strip()
    if "package" in data and data["package"] is not None:
        data["package"] = str(data["package"]).strip()

    for field, value in data.items():
        setattr(product, field, value)

    add_activity(
        db,
        activity_type="product",
        message=f"Product {product.name} ({product.code}) updated.",
        actor=user,
        entity_type="product",
        entity_id=str(product.id),
    )
    await db.commit()
    refreshed = await _get_product(db, product_id)
    return ProductRead.model_validate(refreshed)


@router.post("/{product_id}/adjust-stock", response_model=ProductRead)
async def adjust_stock(
    product_id: UUID,
    payload: StockAdjustRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProductRead:
    product = await _get_product(db, product_id)
    delta = (
        payload.quantity if payload.type in {"restock", "adjustment"} else -payload.quantity
    )
    new_stock = product.stock_qty + delta
    if new_stock < 0:
        raise ApiError(
            409,
            f"Not enough stock for {product.name}. "
            f"Available: {product.stock_qty}, requested: {payload.quantity}.",
            "insufficient_stock",
        )

    product.stock_qty = new_stock
    prefix = {
        "restock": "RESTOCK",
        "adjustment": "ADJUST",
        "waste": "WASTE",
    }[payload.type]
    reference = manual_reference(prefix)
    add_stock_movement(
        db,
        product=product,
        movement_type=payload.type,
        quantity_delta=delta,
        unit_cost=product.cost_price,
        reference=reference,
        note=payload.note or f"Manual {payload.type}",
        created_by=user,
    )
    add_activity(
        db,
        activity_type=payload.type,
        message=(
            f"{payload.type.title()} {payload.quantity} x {product.name} "
            f"({reference})."
        ),
        actor=user,
        entity_type="product",
        entity_id=str(product.id),
    )
    await db.commit()
    refreshed = await _get_product(db, product_id)
    return ProductRead.model_validate(refreshed)
