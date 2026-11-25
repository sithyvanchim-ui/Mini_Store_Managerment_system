"""Wallet position endpoints — visible to staff and admins."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_staff
from app.models import User
from app.schemas.wallets import WalletPosition
from app.services.wallets import build_wallet_position

router = APIRouter(prefix="/wallet", tags=["wallets"])


@router.get("/position", response_model=WalletPosition)
async def wallet_position(
    _user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
) -> WalletPosition:
    """The shop's ABA wallet position: current balance and expected amount.

    Staff and admins can use this to see the wallet position they need before
    paying for products.
    """
    return await build_wallet_position(db)
