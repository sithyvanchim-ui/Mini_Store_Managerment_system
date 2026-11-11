"""Category endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import ApiError
from app.models import Category, Product, User
from app.schemas.categories import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.utils import add_activity

router = APIRouter(prefix="/categories", tags=["categories"])


async def _counts(db: AsyncSession) -> dict[UUID, int]:
    rows = await db.execute(
        select(Product.category_id, func.count(Product.id)).group_by(
            Product.category_id
        )
    )
    return {category_id: int(count) for category_id, count in rows.all()}


@router.get("", response_model=list[CategoryRead])
async def list_categories(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryRead]:
    categories = (
        await db.scalars(select(Category).order_by(Category.name))
    ).all()
    counts = await _counts(db)
    return [
        CategoryRead(
            id=category.id,
            name=category.name,
            color=category.color,
            product_count=counts.get(category.id, 0),
        )
        for category in categories
    ]


@router.post("", response_model=CategoryRead)
async def create_category(
    payload: CategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryRead:
    name = payload.name.strip()
    exists = await db.scalar(
        select(Category.id).where(func.lower(Category.name) == name.lower())
    )
    if exists is not None:
        raise ApiError(409, "A category with this name already exists.", "duplicate_name")

    category = Category(name=name, color=payload.color)
    db.add(category)
    await db.flush()
    add_activity(
        db,
        activity_type="category",
        message=f"Category {name} created.",
        actor=user,
        entity_type="category",
        entity_id=str(category.id),
    )
    await db.commit()
    return CategoryRead(
        id=category.id, name=category.name, color=category.color, product_count=0
    )


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryRead:
    category = await db.get(Category, category_id)
    if category is None:
        raise ApiError(404, "Category not found.", "category_not_found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        name = str(data["name"]).strip()
        duplicate = await db.scalar(
            select(Category.id).where(
                func.lower(Category.name) == name.lower(),
                Category.id != category.id,
            )
        )
        if duplicate is not None:
            raise ApiError(
                409, "A category with this name already exists.", "duplicate_name"
            )
        data["name"] = name

    for field, value in data.items():
        setattr(category, field, value)
    await db.commit()
    counts = await _counts(db)
    return CategoryRead(
        id=category.id,
        name=category.name,
        color=category.color,
        product_count=counts.get(category.id, 0),
    )


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    category = await db.get(Category, category_id)
    if category is None:
        raise ApiError(404, "Category not found.", "category_not_found")

    product_count = await db.scalar(
        select(func.count(Product.id)).where(Product.category_id == category.id)
    )
    if product_count:
        raise ApiError(
            409,
            "Cannot delete a category that still has products.",
            "category_in_use",
        )

    add_activity(
        db,
        activity_type="category",
        message=f"Category {category.name} deleted.",
        actor=admin,
        entity_type="category",
        entity_id=str(category.id),
    )
    await db.delete(category)
    await db.commit()
    return Response(status_code=204)
