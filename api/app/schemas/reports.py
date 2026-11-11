"""Report schemas."""

from uuid import UUID

from pydantic import BaseModel


class ReportSalesPoint(BaseModel):
    period: str
    revenue: int
    profit: int
    units: int
    sales: int


class StaffPerformance(BaseModel):
    user_id: UUID
    name: str
    sales_count: int
    revenue: int
    units: int
