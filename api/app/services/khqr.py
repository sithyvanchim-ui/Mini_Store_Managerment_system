"""KHQR (EMVCo / Bakong) QR string builder.

The store supplies their personal KHQR string (from their own bank app) or a
Bakong account id such as ``name@aba``. To charge a specific amount we either:

1. Re-encode the stored KHQR template: force the dynamic method (tag ``01``
   = ``12``), set the transaction amount (tag ``54``), put the sale reference
   into the additional data (tag ``62``/``01``), and recompute the CRC16
   (tag ``63``). The merchant's real account info (tags ``29``/``30``) stays
   untouched, so the QR routes to the store's true bank account.
2. Build a KHQR from a Bakong account id when no template is available.

Only the *amount* and *reference* differ per sale, so the buyer's bank app
shows the exact amount to pay.
"""

import re

CRC_INIT = 0xFFFF
CRC_POLY = 0x1021

CURRENCY_KHR = "KHR"
ISO4217 = {"KHR": "116", "USD": "840"}


def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16(payload: str) -> str:
    crc = CRC_INIT
    for ch in payload.encode("utf-8"):
        crc ^= ch << 8
        for _ in range(8):
            crc = ((crc << 1) ^ CRC_POLY) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def _sign(payload: str) -> str:
    return payload + "6304" + _crc16(payload + "6304")


def _parse_tlv(data: str) -> dict[str, str]:
    """Parse a TLV string into {tag: raw value}."""
    items: dict[str, str] = {}
    index = 0
    while index + 4 <= len(data):
        tag = data[index : index + 2]
        length = int(data[index + 2 : index + 4])
        value = data[index + 4 : index + 4 + length]
        items[tag] = value
        index += 4 + length
    return items


def _serialize(items: list[tuple[str, str]]) -> str:
    return "".join(_tlv(tag, value) for tag, value in items)


def _looks_like_khqr(value: str) -> bool:
    return bool(re.fullmatch(r"\d{2}(\d{2}\d{2}.*)+", value))


def build_khqr(
    *,
    template: str | None,
    account_id: str | None,
    amount: int,
    currency: str = CURRENCY_KHR,
    reference: str | None = None,
    merchant_name: str = "MiniStore",
    city: str = "Phnom Penh",
) -> str:
    """Return a KHQR string charging ``amount`` to the store's account."""
    currency_code = ISO4217.get(currency.upper(), ISO4217[CURRENCY_KHR])
    amount_text = str(amount)

    if template and _looks_like_khqr(template.strip()):
        items = _parse_tlv(template.strip())
        # Dynamic, amount-locked QR.
        ordered: list[tuple[str, str]] = []
        for tag, value in items.items():
            if tag in {"63", "01", "54", "62"}:
                continue
            ordered.append((tag, value))
        result: dict[str, str] = dict(ordered)
        result["01"] = "12"  # dynamic (one-time use)
        result["54"] = amount_text
        if reference:
            result["62"] = _tlv("01", reference)
        # Re-serialize in ascending tag order (EMVCo requirement).
        return _sign(_serialize(sorted(result.items())))

    # Build from a Bakong account id (e.g. "name@aba" or "85512345678").
    account = (account_id or template or "").strip()
    if not account:
        raise ValueError("No KHQR account configured for this store.")
    merchant_info = _tlv("00", account)
    fields: dict[str, str] = {
        "00": "01",  # payload format indicator
        "01": "12",  # dynamic
        "29": merchant_info,  # Bakong merchant account
        "52": "5499",  # MCC: retail
        "53": currency_code,
        "54": amount_text,
        "58": "KH",
        "59": merchant_name[:25],
        "60": city[:15],
    }
    if reference:
        fields["62"] = _tlv("01", reference)
    return _sign(_serialize(sorted(fields.items())))
