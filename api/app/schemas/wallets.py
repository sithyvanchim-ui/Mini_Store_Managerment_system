"""Wallet position schema — the shop's current ABA wallet state."""

from datetime import datetime

from pydantic import BaseModel


class WalletPosition(BaseModel):
    """The shop's ABA wallet position for staff and admins.

    ``aba_balance`` is the recorded wallet balance (today's close if it exists,
    otherwise the latest close). ``expected_balance`` is the amount that should
    be on the wallet now from ABA sales today minus expenses paid out of the
    wallet. ``variance`` is the difference between the two when the balance is
    known.
    """

    aba_balance: int | None
    expected_balance: int
    variance: int | None
    as_of: datetime
