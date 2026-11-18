"""Customer storefront endpoints.

Customers log in with accounts created by admins, browse the product menu,
and place their own orders (KHQR / Alipay / card / Pi Pay / ACLEDA — no
cash). They never see cost prices, discounts, or the staff dashboard.
"""

from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Category, Product, Sale, User
from app.schemas.common import Page
from app.schemas.sales import SaleCreate, SaleItemCreate, SaleRead
from app.schemas.store import StoreCheckoutCreate, StoreProductRead
from app.services.sales import create_sale as _create_sale

router = APIRouter(prefix="/store", tags=["store"])


class StoreMenu(BaseModel):
    items: list[StoreProductRead]
    total: int


def _store_product(product: Product) -> StoreProductRead:
    return StoreProductRead(
        id=product.id,
        name=product.name,
        package=product.package,
        selling_price=product.selling_price,
        stock_qty=product.stock_qty,
        location=product.location,
        stock_status=product.stock_status,
        category_name=product.category.name if product.category else None,
    )


@router.get("/products", response_model=StoreMenu)
async def store_menu(
    q: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StoreMenu:
    """The buyable menu: every active product with its price and availability."""
    conditions = [Product.is_active.is_(True)]
    if q:
        term = f"%{q.strip()}%"
        conditions.append(Product.name.ilike(term))

    products = (
        await db.scalars(
            select(Product)
            .join(Category, Category.id == Product.category_id)
            .where(*conditions)
            .order_by(Category.name, Product.name)
        )
    ).all()
    total = await db.scalar(select(func.count(Product.id)).where(*conditions))
    return StoreMenu(
        items=[_store_product(product) for product in products],
        total=int(total or 0),
    )


@router.post("/checkout", response_model=SaleRead, status_code=201)
async def store_checkout(
    payload: StoreCheckoutCreate,
    idempotency_key: str | None = Header(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SaleRead:
    """Customer self-checkout: same sale engine as the POS, no discount."""
    sale = await _create_sale(
        db,
        payload=SaleCreate(
            items=[
                SaleItemCreate(product_id=item.product_id, quantity=item.quantity)
                for item in payload.items
            ],
            payment_method=payload.payment_method,
            notes=payload.notes,
        ),
        user=user,
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
    )
    return SaleRead.model_validate(sale)


@router.get("/orders", response_model=Page[SaleRead])
async def my_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[SaleRead]:
    """The signed-in customer's own purchase history."""
    conditions = [Sale.sold_by_id == user.id]
    total = await db.scalar(select(func.count(Sale.id)).where(*conditions))
    sales = (
        await db.scalars(
            select(Sale)
            .where(*conditions)
            .order_by(Sale.created_at.desc(), Sale.reference.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return Page(
        items=[SaleRead.model_validate(sale) for sale in sales],
        total=int(total or 0),
        page=page,
        page_size=page_size,
    )
