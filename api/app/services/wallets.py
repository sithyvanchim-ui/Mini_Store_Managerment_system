"""Shop wallet position for staff and admins.

The MiniStore wallet is the ABA wallet. This service builds the current wallet
position: what the wallet recorded after the most recent close, what the wallet
is expected to hold today, and the variance between the two.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyClose
from app.schemas.wallets import WalletPosition
from app.services.daily_closes import sales_totals


async def build_wallet_position(
    db: AsyncSession,
    business_date: date | None = None,
) -> WalletPosition:
    """Return the shop's current ABA wallet position."""

    business_date = business_date or date.today()
    totals = await sales_totals(db, business_date)

    today_close = await db.scalar(
        select(DailyClose).where(DailyClose.business_date == business_date)
    )
    expenses = today_close.expenses if today_close else 0
    expected_balance = totals["aba_sales"] - expenses

    if today_close is not None and today_close.aba_balance is not None:
        aba_balance = today_close.aba_balance
    else:
        latest = await db.scalar(
            select(DailyClose)
            .order_by(DailyClose.business_date.desc(), DailyClose.closed_at.desc())
            .limit(1)
        )
        aba_balance = latest.aba_balance if latest is not None else None

    variance = (
        aba_balance - expected_balance if aba_balance is not None else None
    )

    return WalletPosition(
        aba_balance=aba_balance,
        expected_balance=expected_balance,
        variance=variance,
        as_of=datetime.now(UTC),
    )
