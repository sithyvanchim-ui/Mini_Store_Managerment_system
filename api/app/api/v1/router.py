"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import (
    auth,
    categories,
    daily_closes,
    dashboard,
    expenses,
    fund_requests,
    payments,
    products,
    purchases,
    reports,
    sales,
    settings,
    stock,
    store,
    suppliers,
    users,
)

api_router = APIRouter()

for module in (
    auth,
    users,
    categories,
    products,
    suppliers,
    purchases,
    sales,
    stock,
    daily_closes,
    dashboard,
    reports,
    settings,
    fund_requests,
    expenses,
    payments,
    store,
):
    api_router.include_router(module.router)
