"""Shared date, reference, and activity-log helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityLog, User


def day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


def _parse_datetime(value: str | None, *, end: bool = False) -> datetime | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Invalid date value: {value}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    else:
        parsed = parsed.astimezone(UTC)
    # A date-only `to` value should include the whole day.
    if end and len(cleaned) <= 10:
        return parsed + timedelta(days=1)
    return parsed


def parse_range(
    from_value: str | None,
    to_value: str | None,
) -> tuple[datetime | None, datetime | None]:
    """Parse API date/date-time filters into an exclusive UTC range."""

    try:
        start = _parse_datetime(from_value)
        end = _parse_datetime(to_value, end=True)
    except ValueError:
        return None, None
    return start, end


def month_key() -> str:
    """Current UTC month as `YYYY-MM`."""

    return datetime.now(UTC).strftime("%Y-%m")


def month_bounds(month: str) -> tuple[datetime, datetime]:
    year, value = (int(part) for part in month.split("-"))
    start = datetime(year, value, 1, tzinfo=UTC)
    if value == 12:
        end = datetime(year + 1, 1, 1, tzinfo=UTC)
    else:
        end = datetime(year, value + 1, 1, tzinfo=UTC)
    return start, end


async def generate_reference(
    db: AsyncSession,
    model: Any,
    date_column: Any,
    prefix: str,
    moment: datetime,
) -> str:
    start, end = day_bounds(moment.date())
    count = await db.scalar(
        select(func.count()).select_from(model).where(
            date_column >= start, date_column < end
        )
    )
    return f"{prefix}-{moment:%Y%m%d}-{(count or 0) + 1:04d}"


def manual_reference(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def add_activity(
    db: AsyncSession,
    *,
    activity_type: str,
    message: str,
    actor: User | None = None,
    actor_name: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    created_at: datetime | None = None,
    meta: dict[str, Any] | None = None,
) -> ActivityLog:
    log = ActivityLog(
        type=activity_type,
        message=message,
        actor_name=actor.name if actor else (actor_name or "System"),
        user_id=actor.id if actor else None,
        entity_type=entity_type,
        entity_id=entity_id,
        meta=meta,
        created_at=created_at or datetime.now(UTC),
    )
    db.add(log)
    return log
