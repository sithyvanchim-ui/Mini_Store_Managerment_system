"""Idempotent demo-data seed for MiniStore.

Usage:
    uv run python -m app.seed

Imports the 22 products from the archived prototype (normalising duplicate
codes with category prefixes), creates demo users, suppliers, settings, and a
deterministic ledger of sales, purchases, stock movements, and daily closes.
Re-running the seed skips history generation when data already exists.
"""

from __future__ import annotations

import asyncio
import random
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    ActivityLog,
    AppSettings,
    Category,
    DailyClose,
    Product,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    StockMovement,
    Supplier,
    User,
)

SEED_RANDOM = random.Random(20261106)
DAYS_OF_SALES = 75
CLOSING_DAYS = 30
ACTIVITY_DAYS = 14

CATEGORY_DEFS: list[tuple[str, str]] = [
    ("Drink", "#0FB5A0"),
    ("Milk & Jelly", "#AAB2F8"),
    ("Noodle", "#F3B34C"),
]

# (category, code, name, package, initial stock, cost, selling, location, slot)
PRODUCT_DEFS: list[tuple[str, str, str, str, int, int, int, str, str]] = [
    ("Drink", "DRK-1001", "Kulen (Big)", "Bottle", 12, 2667, 3000, "fridge", "F1-01"),
    ("Drink", "DRK-1002", "Kulen (Small)", "Bottle", 24, 1333, 2000, "fridge", "F1-02"),
    ("Drink", "DRK-1003", "Provida (Big)", "Bottle", 38, 1305, 2000, "fridge", "F1-03"),
    # Prototype showed -2 on hand; normalised to a small positive count.
    ("Drink", "DRK-1004", "Provida (Small)", "Bottle", 3, 510, 1000, "fridge", "F1-04"),
    ("Drink", "DRK-1005", "Coca cola", "Can", 92, 1372, 2000, "fridge", "F1-05"),
    ("Drink", "DRK-1006", "Ize", "Bottle", 76, 1607, 2500, "fridge", "F1-06"),
    ("Drink", "DRK-1007", "Chinese Tea", "Bottle", 30, 2275, 3000, "fridge", "F1-07"),
    ("Drink", "DRK-1008", "Yeo's", "Can", 56, 1563, 2000, "fridge", "F1-08"),
    ("Drink", "DRK-1009", "Aloe vera juice", "Bottle", 6, 1805, 2500, "fridge", "F1-09"),
    ("Drink", "DRK-1010", "Water Vitamic C 500ML", "Package", 6, 2870, 3500, "fridge", "F1-10"),
    ("Drink", "DRK-1011", "Pocari Sweat", "Bottle", 24, 3025, 3500, "fridge", "F1-11"),
    ("Milk & Jelly", "MJK-1012", "Fruit Yogurt", "Bottle", 12, 3212, 4000, "fridge", "F2-01"),
    ("Milk & Jelly", "MJK-1013", "Yogurt Jelly", "Package", 12, 3569, 4000, "fridge", "F2-02"),
    ("Milk & Jelly", "MJK-1014", "Yogurt 28 + Drink", "Package", 9, 3212, 3700, "fridge", "F2-03"),
    # Kept deliberately negative-margin (cost 2424 vs selling 2000, prototype data).
    ("Milk & Jelly", "MJK-1015", "Dalat Straw Milk 180 ML", "Bottle", 40, 2424, 2000, "fridge", "F2-04"),
    ("Milk & Jelly", "MJK-1016", "Dalat Choco Milk 180 ML", "Bottle", 1, 2424, 5500, "fridge", "F2-05"),
    ("Milk & Jelly", "MJK-1017", "Dalat Sweet Milk 450 Ml", "Bottle", 4, 4627, 5000, "shelf", "S1-01"),
    ("Milk & Jelly", "MJK-1018", "Angkor Milk", "Bottle", 48, 1045, 1700, "fridge", "F2-06"),
    ("Milk & Jelly", "MJK-1019", "Yogurt", "Package", 48, 1087, 1700, "shelf", "S1-04"),
    ("Milk & Jelly", "MJK-1020", "Jele Jelly", "Package", 36, 1139, 1700, "shelf", "S1-05"),
    ("Noodle", "NDL-1021", "Noodle (Mic Chet)", "Package", 24, 1843, 2500, "shelf", "S1-02"),
    ("Noodle", "NDL-1022", "Noodle (Pop Me)", "Package", 6, 1458, 2000, "shelf", "S1-03"),
]

SUPPLIER_DEFS: list[tuple[str, str, str, str, str, str]] = [
    (
        "Phnom Penh Wholesale Drinks",
        "Sok Chan",
        "+855 12 345 678",
        "orders@pp-wholesale.local",
        "St. 271, Phnom Penh",
        "Main drinks supplier. Delivers Tue and Fri mornings.",
    ),
    (
        "Angkor Dairy Distribution",
        "Malis Chetra",
        "+855 97 234 567",
        "sales@angkordairy.local",
        "Russian Blvd, Phnom Penh",
        "Milk and jelly supplier. Call one day ahead.",
    ),
    (
        "Cambodia Snack & Noodle Co.",
        "Vuthy Dara",
        "+855 88 123 456",
        "supply@kh-snacks.local",
        "Mao Tse Toung Blvd, Phnom Penh",
        "Noodles and packaged snacks. Weekly restock.",
    ),
]

USER_DEFS: list[tuple[str, str, str, str]] = [
    ("Sarah Green", "admin@ministore.local", "Admin123!", "admin"),
    ("Dara Sok", "staff@ministore.local", "Staff123!", "staff"),
]


def _sale_timestamp(day_start: datetime, now: datetime) -> datetime:
    hour = SEED_RANDOM.randint(6, 22)
    minute = SEED_RANDOM.choice((0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55))
    moment = day_start.replace(hour=hour, minute=minute, second=SEED_RANDOM.randint(0, 59), microsecond=0)
    return min(moment, now - timedelta(seconds=1))


def _sale_reference(day_start: datetime, sequence: int) -> str:
    return f"MS-{day_start:%Y%m%d}-{sequence:04d}"


def _purchase_reference(day_start: datetime, sequence: int) -> str:
    return f"PO-{day_start:%Y%m%d}-{sequence:04d}"


async def _ensure_reference_data(db: AsyncSession) -> tuple[dict[str, User], dict[str, Category], list[Supplier]]:
    """Create users, suppliers, categories, and products when missing."""

    if await db.scalar(select(func.count(AppSettings.id))) == 0:
        db.add(
            AppSettings(
                store_name="MiniStore",
                dorm_name="Block C Dorm",
                currency="KHR",
                low_stock_default=6,
                receipt_footer="Thank you! Please keep the fridge tidy.",
            )
        )

    users: dict[str, User] = {}
    for user in (await db.scalars(select(User))).all():
        users[user.role] = user
    for name, email, password, role in USER_DEFS:
        if role not in users:
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role=role,
                is_active=True,
            )
            db.add(user)
            users[role] = user

    suppliers: list[Supplier] = list((await db.scalars(select(Supplier))).all())
    if not suppliers:
        for name, contact, phone, email, address, notes in SUPPLIER_DEFS:
            supplier = Supplier(
                name=name,
                contact_name=contact,
                phone=phone,
                email=email,
                address=address,
                notes=notes,
                is_active=True,
            )
            db.add(supplier)
            suppliers.append(supplier)

    categories: dict[str, Category] = {}
    for category in (await db.scalars(select(Category))).all():
        categories[category.name] = category
    for name, color in CATEGORY_DEFS:
        if name not in categories:
            category = Category(name=name, color=color)
            db.add(category)
            categories[name] = category

    await db.flush()

    for cat_name, code, product_name, package, stock, cost, selling, location, slot in PRODUCT_DEFS:
        if await db.scalar(select(Product.id).where(Product.code == code)) is None:
            db.add(
                Product(
                    code=code,
                    name=product_name,
                    category_id=categories[cat_name].id,
                    package=package,
                    cost_price=cost,
                    selling_price=selling,
                    stock_qty=stock,
                    low_stock_threshold=6,
                    location=location,
                    slot_code=slot,
                    is_active=True,
                )
            )

    await db.commit()
    suppliers = list((await db.scalars(select(Supplier).order_by(Supplier.name))).all())


    return users, categories, suppliers


async def _generate_history(
    db: AsyncSession,
    *,
    admin: User,
    staff: User,
    suppliers: list[Supplier],
    products: list[Product],
) -> None:
    """Deterministic sales/purchases/stock ledger, then daily closes."""

    now = datetime.now(UTC)

    running_stock: dict[int, int] = {product.id: product.stock_qty for product in products}
    par_stock = dict(running_stock)
    for product in products:
        # Keep a healthy par level so the demo fridge never fully drains.
        par_stock[product.id] = max(12, product.stock_qty)
    product_map = {product.id: product for product in products}
    daily_totals: dict[int, dict[str, int]] = defaultdict(
        lambda: {"aba": 0, "profit": 0}
    )

    for day_offset in range(DAYS_OF_SALES, -1, -1):
        day_start = (now - timedelta(days=day_offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        seller = staff if SEED_RANDOM.random() < 0.7 else admin

        # Purchases every three days replenish low products to par level.
        line_defs: list[tuple[Product, int]] = []
        if day_offset % 3 == 0 and day_offset > 0:
            supplier = suppliers[(day_offset // 3) % len(suppliers)]
            restock_candidates: list[tuple[Product, int]] = []
            for product_id, target in par_stock.items():
                deficit = target - running_stock[product_id]
                if deficit >= 6:
                    restock_candidates.append((product_map[product_id], deficit))
            restock_candidates.sort(key=lambda pair: -pair[1])
            line_defs = restock_candidates[:6]

            if line_defs:
                purchased_at = day_start.replace(hour=7, minute=0, second=0)
            total_quantity = sum(quantity for _, quantity in line_defs)
            total_cost = sum(
                product.cost_price * quantity for product, quantity in line_defs
            )
            reference = _purchase_reference(day_start, 1)
            purchase = Purchase(
                reference=reference,
                supplier_id=supplier.id,
                purchased_at=purchased_at,
                total_quantity=total_quantity,
                total_cost=total_cost,
                notes=None,
                created_by_id=admin.id,
                created_at=purchased_at,
                updated_at=purchased_at,
            )
            purchase.items = []
            for product, quantity in line_defs:
                purchase.items.append(
                    PurchaseItem(
                        product_id=product.id,
                        product_code=product.code,
                        product_name=product.name,
                        quantity=quantity,
                        unit_cost=product.cost_price,
                        line_total=product.cost_price * quantity,
                    )
                )
                running_stock[product.id] += quantity
                product.stock_qty += quantity
                db.add(
                    StockMovement(
                        product_id=product.id,
                        type="restock",
                        quantity_delta=quantity,
                        unit_cost=product.cost_price,
                        reference=reference,
                        note=f"Purchase from {supplier.name}",
                        created_by_id=admin.id,
                        created_at=purchased_at,
                    )
                )
            db.add(purchase)
            if day_offset <= ACTIVITY_DAYS:
                db.add(
                    ActivityLog(
                        type="restock",
                        message=(
                            f"Restocked {total_quantity} units from {supplier.name} "
                            f"({reference})."
                        ),
                        actor_name=admin.name,
                        user_id=admin.id,
                        entity_type="purchase",
                        entity_id=reference,
                        created_at=purchased_at,
                    )
                )

        # Sales for the day.
        for sale_sequence in range(1, SEED_RANDOM.randint(6, 14) + 1):
            product_pool = [
                product
                for product in products
                if running_stock[product.id] > 0 and product.is_active
            ]
            if not product_pool:
                continue

            item_defs: list[tuple[Product, int]] = []
            for product in SEED_RANDOM.sample(
                product_pool, min(len(product_pool), SEED_RANDOM.randint(1, 3))
            ):
                max_quantity = min(
                    2 if product.selling_price >= 3000 else 3,
                    running_stock[product.id],
                )
                if max_quantity >= 1:
                    item_defs.append((product, SEED_RANDOM.randint(1, max_quantity)))
            if not item_defs:
                continue

            created_at = _sale_timestamp(day_start, now)
            subtotal = sum(
                product.selling_price * quantity for product, quantity in item_defs
            )
            discount = SEED_RANDOM.choice((0, 0, 0, 500)) if subtotal >= 8000 else 0
            total = subtotal - discount

            reference = _sale_reference(day_start, sale_sequence)
            sale = Sale(
                reference=reference,
                subtotal=subtotal,
                discount=discount,
                total=total,
                status="completed",
                sold_by_id=seller.id,
                created_at=created_at,
                updated_at=created_at,
            )
            sale.items = []
            day_totals = daily_totals[day_offset]
            for product, quantity in item_defs:
                line_total = product.selling_price * quantity
                line_profit = (product.selling_price - product.cost_price) * quantity
                sale.items.append(
                    SaleItem(
                        product_id=product.id,
                        product_code=product.code,
                        product_name=product.name,
                        unit_price=product.selling_price,
                        unit_cost=product.cost_price,
                        quantity=quantity,
                        line_total=line_total,
                        line_profit=line_profit,
                    )
                )
                running_stock[product.id] -= quantity
                product.stock_qty -= quantity
                gross_profit_delta = line_profit
                db.add(
                    StockMovement(
                        product_id=product.id,
                        type="sale",
                        quantity_delta=-quantity,
                        unit_cost=product.cost_price,
                        reference=reference,
                        note=f"Sale {reference}",
                        created_by_id=seller.id,
                        created_at=created_at,
                    )
                )
            day_totals["aba"] += total
            day_totals["profit"] += gross_profit_delta

            db.add(sale)
            if day_offset <= ACTIVITY_DAYS:
                db.add(
                    ActivityLog(
                        type="sale",
                        message=f"Sale {reference} completed for {total:,} KHR.",
                        actor_name=seller.name,
                        user_id=seller.id,
                        entity_type="sale",
                        entity_id=reference,
                        created_at=created_at,
                    )
                )
            await db.flush()

        # Per-day flush keeps memory bounded.
        if day_offset % 10 == 0:
            await db.flush()

    # Final stocktake adjustment so the demo fridge opens day one stocked.
    adjustment_day = now.replace(hour=5, minute=0, second=0)
    for product in products:
        deficit = min(6, product.low_stock_threshold) - running_stock[product.id]
        if deficit > 0:
            product.stock_qty += deficit
            running_stock[product.id] += deficit
            db.add(
                StockMovement(
                    product_id=product.id,
                    type="adjustment",
                    quantity_delta=deficit,
                    unit_cost=product.cost_price,
                    reference="STOCKTAKE-001",
                    note="Stocktake top-up before opening",
                    created_by_id=admin.id,
                    created_at=adjustment_day,
                )
            )
    db.add(
        ActivityLog(
            type="adjustment",
            message="Stocktake top-up applied to low-stock products.",
            actor_name=admin.name,
            user_id=admin.id,
            entity_type="product",
            entity_id="STOCKTAKE-001",
            created_at=adjustment_day,
        )
    )
    await db.commit()

    # Daily closes for the last CLOSING_DAYS days (today stays open for the demo).
    for day_offset in range(CLOSING_DAYS, 0, -1):
        business_date = (now - timedelta(days=day_offset)).date()
        day_totals = daily_totals[day_offset]
        aba_sales = day_totals["aba"]
        gross_profit = day_totals["profit"]
        expenses = SEED_RANDOM.choice((0, 0, 0, 1000, 2500))
        # Expected ABA balance = ABA sales minus expenses paid from the wallet.
        # Small jitter models reconciliation differences (rounding, timing).
        jitter = SEED_RANDOM.choice((0, 0, 0, 0, -500, -1500, 1000))
        aba_balance = aba_sales - expenses + jitter
        close = DailyClose(
            business_date=business_date,
            aba_sales=aba_sales,
            total_sales=aba_sales,
            gross_profit=gross_profit,
            expenses=expenses,
            variance=jitter,
            aba_balance=aba_balance,
            notes=None,
            closed_by_id=(admin if day_offset % 4 == 0 else staff).id,
            closed_at=datetime.now(UTC)
            - timedelta(days=day_offset, hours=-2),
            created_at=datetime.now(UTC),
        )
        db.add(close)
        if day_offset <= ACTIVITY_DAYS:
            db.add(
                ActivityLog(
                    type="daily_close",
                    message=(
                        f"Daily close for {business_date.isoformat()} recorded "
                        f"(variance {close.variance:+,} KHR)."
                    ),
                    actor_name="Sarah Green" if day_offset % 4 == 0 else "Dara Sok",
                    entity_type="daily_close",
                    entity_id=business_date.isoformat(),
                    created_at=close.closed_at,
                )
            )
    await db.commit()


async def seed() -> None:
    async with SessionLocal() as db:
        product_count = await db.scalar(select(func.count(Product.id)))
        sale_count = await db.scalar(select(func.count(Sale.id)))

        if product_count and sale_count:
            print("Seed skipped: data already present.")
            await _report(db)
            return

        admin_row = await db.scalar(select(User).where(User.email == "admin@ministore.local"))
        staff_row = await db.scalar(select(User).where(User.email == "staff@ministore.local"))
        if admin_row is None or staff_row is None:
            await _ensure_reference_data(db)
            admin_row = await db.scalar(select(User).where(User.email == "admin@ministore.local"))
            staff_row = await db.scalar(select(User).where(User.email == "staff@ministore.local"))
        assert admin_row is not None and staff_row is not None
        supplier_rows = list((await db.scalars(select(Supplier).order_by(Supplier.name))).all())
        product_rows = list((await db.scalars(select(Product).order_by(Product.code))).all())

        await _generate_history(
            db,
            admin=admin_row,
            staff=staff_row,
            suppliers=supplier_rows,
            products=product_rows,
        )
        await _report(db)


async def _report(db: AsyncSession) -> None:
    counts = {
        "products": await db.scalar(select(func.count(Product.id))),
        "categories": await db.scalar(select(func.count(Category.id))),
        "suppliers": await db.scalar(select(func.count(Supplier.id))),
        "users": await db.scalar(select(func.count(User.id))),
        "sales": await db.scalar(select(func.count(Sale.id))),
        "purchases": await db.scalar(select(func.count(Purchase.id))),
        "stock_movements": await db.scalar(select(func.count(StockMovement.id))),
        "daily_closes": await db.scalar(select(func.count(DailyClose.id))),
        "activity_logs": await db.scalar(select(func.count(ActivityLog.id))),
    }
    print("Seed summary:")
    for key, value in counts.items():
        print(f"  {key:>15}: {value}")


if __name__ == "__main__":
    asyncio.run(seed())
