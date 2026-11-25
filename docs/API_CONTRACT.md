# MiniStore API Contract

Base URL: `/api/v1`  
Auth: httpOnly `access_token` cookie (JWT). All dashboard endpoints require a valid session.  
Money: integer KHR. Dates: ISO 8601 UTC strings. Pagination: `{ items, total, page, page_size }`.

## Roles

Two roles: `admin` and `staff`.

- **Read access:** both roles can `GET` everything on the dashboard (products, sales, purchases, stock, expenses, fund requests, analytics, …).
- **Write access:** every mutating endpoint (`POST`/`PATCH`/`DELETE` on products, categories, suppliers, purchases, sales, stock adjustments, expenses, fund requests, daily closes, users, settings) returns **403** for staff — only admins can insert, update, or delete.
- Staff keep `GET /auth/me`, `POST /auth/logout`, and `POST /auth/change-password` (their own password).

## Auth

### `POST /auth/login`
```json
{ "email": "admin@ministore.local", "password": "Admin123!" }
```
Response: `{ "user": User }` and `Set-Cookie: access_token=...; HttpOnly; SameSite=Lax; Path=/`.

### `POST /auth/logout`
Clears the cookie. Response `204`.

### `GET /auth/me`
Response: `{ "user": User }`.

### `POST /auth/change-password`
```json
{ "current_password": "...", "new_password": "..." }
```
Response `204`.

## Users (admin only)

- `GET /users?page=1&page_size=20&q=`
- `POST /users` — `{ name, email, password, role }`
- `PATCH /users/{id}` — `{ name?, email?, role?, is_active? }`

`User`: `{ id, name, email, role: "admin"|"staff", is_active, created_at }`.

## Categories

- `GET /categories` → `Category[]` (includes `product_count`)
- `POST /categories` — `{ name, color? }`
- `PATCH /categories/{id}` — `{ name?, color? }`
- `DELETE /categories/{id}` — 409 if products exist.

`Category`: `{ id, name, color, product_count }`.

## Products

### `GET /products?q=&category_id=&status=&location=&page=1&page_size=20&sort=name`
`status` is `in_stock`, `low_stock`, or `out_of_stock`.

`Product`:
```json
{
  "id": "uuid",
  "code": "DRK-1001",
  "name": "Kulen (Big)",
  "category_id": "uuid",
  "category": { "id": "uuid", "name": "Drink", "color": "#0FB5A0" },
  "package": "Bottle",
  "cost_price": 2667,
  "selling_price": 3000,
  "stock_qty": 12,
  "store_qty": 8,
  "sell_qty": 4,
  "low_stock_threshold": 6,
  "location": "fridge",
  "slot_code": "F1-01",
  "is_active": true,
  "margin": 333,
  "stock_status": "in_stock",
  "store_status": "in_stock",
  "created_at": "...",
  "updated_at": "..."
}
```

`stock_qty` is the total on hand; `store_qty` is the subset on display for customer purchases; `sell_qty` is the remainder held for counter sales. `store_status` describes the display only.

- `POST /products` — `{ code, name, category_id, package, cost_price, selling_price, stock_qty, store_qty, low_stock_threshold, location, slot_code?, is_active? }`
- `PATCH /products/{id}` — partial product fields; price/category edits allowed. When both `stock_qty` and `store_qty` are supplied, `0 ≤ store_qty ≤ stock_qty` is enforced.
- `POST /products/{id}/adjust-stock` — `{ type: "restock"|"adjustment"|"waste", quantity: 5, note? }`
  - `quantity` is a positive count; type determines sign.
  - Restocks and adjustments add to the selling pool; waste clamps `store_qty` to the new total.
  - Returns the updated product.
- `POST /products/{id}/transfer-stock` — admin only; `{ to: "store"|"sell", quantity: 5, note? }`
  - Moves units between the store display and the selling pool, writes a `transfer` movement, and leaves `stock_qty` unchanged.
  - `409` if the source place does not hold enough units. Returns the updated product.
- `POST /products/{id}/insert-stock` — admin only; `{ place: "store"|"sell", quantity: 5, note? }`
  - Adds units to one stock place: inserting into the store display increases `stock_qty` and `store_qty`; inserting into the selling pool increases `stock_qty` (raising `sell_qty = stock_qty - store_qty`).
  - Writes a `restock` movement. Returns the updated product.
- `POST /products/{id}/clear-place` — admin only; `{ place: "store"|"sell", note? }`
  - Zeros one place: clearing the store display sets `store_qty = 0`; clearing the selling pool sets `store_qty = stock_qty`. Writes a `transfer` movement. Returns the updated product.

## Suppliers

- `GET /suppliers?q=&page=1&page_size=20`
- `POST /suppliers` — `{ name, contact_name?, phone?, email?, address?, notes? }`
- `PATCH /suppliers/{id}`
- `DELETE /suppliers/{id}` — soft deactivate; 409 if referenced by purchases.

`Supplier`: `{ id, name, contact_name, phone, email, address, notes, is_active, created_at }`.

## Purchases

### `GET /purchases?page=1&page_size=20&supplier_id=&from=&to=`
### `POST /purchases`
```json
{
  "supplier_id": "uuid",
  "purchased_at": "2026-11-06T10:00:00Z",
  "notes": "Weekly restock",
  "items": [
    { "product_id": "uuid", "quantity": 24, "unit_cost": 2667 }
  ]
}
```
Server creates the purchase, increments stock, and writes `restock` movements. Response `Purchase`.

`Purchase`: `{ id, reference, supplier_id, supplier, purchased_at, total_quantity, total_cost, notes, created_by_name, items: PurchaseItem[] }`  
`PurchaseItem`: `{ id, product_id, product_code, product_name, quantity, unit_cost, line_total }`.

## Sales

All sales settle via ABA transfer — there is no cash handling.

### `POST /sales`
Header: optional `Idempotency-Key`.
```json
{
  "items": [{ "product_id": "uuid", "quantity": 2 }],
  "discount": 0,
  "payment_method": "aba_khqr",
  "notes": ""
}
```
`payment_method` (admin-only field): `aba_khqr | alipay | card | pi_pay | acleda`. Default `aba_khqr`; older sales are backfilled as `aba_khqr`.
Server computes unit prices and totals, locks products, rejects insufficient stock with `409`, decrements stock, writes `sale` movements, and returns the sale. Counter sales (`channel: "counter"`) draw from the selling pool first and dip into the store display only when needed; customer storefront sales (`channel: "store"`) take units from the store display only.

`Sale`:
```json
{
  "id": "uuid",
  "reference": "MS-20261106-0001",
  "payment_method": "aba_khqr",
  "subtotal": 6000,
  "discount": 0,
  "total": 6000,
  "status": "completed",
  "channel": "counter",
  "sold_by_name": "Sarah Green",
  "notes": "",
  "created_at": "...",
  "items": [
    { "product_id": "uuid", "product_code": "DRK-1001", "product_name": "Kulen (Big)", "unit_price": 3000, "unit_cost": 2667, "quantity": 2, "line_total": 6000, "line_profit": 666 }
  ]
}
```

- `GET /sales?page=1&page_size=20&status=&from=&to=&q=`
- `GET /sales/{id}`
- `POST /sales/{id}/void` — admin only; restores stock and writes `void` movements. Units sold through the storefront return to the store display. Response `Sale` with status `voided`.

## Charges

- `POST /charges` — admin only; `{ product_id, quantity = 1, note? }`.
  - Creates a pending charge using the product’s `selling_price * quantity` as the amount.
  - Response `ChargeRead`: `{ id, reference, amount, quantity, product_code, product_name, note, status, qr, wallet_position, created_by_name, created_at }`.
  - `qr` is the KHQR string for the exact charge amount (returns `409` if no KHQR account is configured).
  - `wallet_position` is the shop ABA wallet position (`aba_balance`, `expected_balance`, `variance`).
- `GET /charges?page=1&page_size=20` — staff/admins list charges (without `qr`).

## Stock

### `GET /stock/summary?month=2026-11`
```json
{
  "month": "2026-11",
  "product_count": 22,
  "total_units": 599,
  "store_units": 410,
  "sell_units": 189,
  "inventory_value": 1023300,
  "retail_value": 1335800,
  "units_sold": 702,
  "revenue": 1335800,
  "gross_profit": 452876,
  "low_stock_count": 5,
  "out_of_stock_count": 2,
  "category_mix": [{ "category": "Drink", "revenue": 500000, "units": 240, "percent": 37.4, "color": "#0FB5A0" }],
  "top_products": [{ "product_id": "uuid", "name": "Angkor Milk", "code": "MJK-1016", "units_sold": 319, "revenue": 542300, "profit": 208925 }],
  "alerts": [{ "product_id": "uuid", "name": "Provida (Small)", "code": "DRK-1004", "stock_qty": 2, "store_qty": 1, "sell_qty": 1, "threshold": 6, "status": "low_stock", "store_status": "low_stock", "slot_code": "F2-03" }],
  "items": [ProductStockRow]
}
```
`ProductStockRow` adds `units_sold`, `revenue`, `profit`, `retail_value`, `cost_value` to a product. `store_units` and `sell_units` split `total_units` across the two places.

- `GET /stock/alerts` → low/out-of-stock products, with `store_qty`, `sell_qty`, and `store_status`.
- `GET /stock/movements?product_id=&type=&page=1&page_size=30` — `type` may be `restock`, `sale`, `adjustment`, `waste`, `void`, or `transfer`.
- `GET /stock/monthly?months=6` → `[{ month, units_sold, revenue, profit, closing_units }]`

`StockMovement`: `{ id, product_id, product_code, product_name, type, quantity_delta, unit_cost, reference, note, created_by_name, created_at }`. `transfer` movements have `quantity_delta: 0` and describe the move in `note`.

## Daily close

End-of-day ABA reconciliation: expected balance = ABA sales − expenses; variance = wallet balance − expected.

### `GET /daily-closes/today`
Returns today's computed totals and any existing close:
```json
{
  "business_date": "2026-11-06",
  "aba_sales": 57500,
  "total_sales": 57500,
  "gross_profit": 18000,
  "expenses": 0,
  "variance": null,
  "aba_balance": null,
  "existing_close": null
}
```
### `POST /daily-closes`
```json
{
  "business_date": "2026-11-06",
  "aba_balance": 56500,
  "expenses": 1000,
  "notes": "Evening close"
}
```
Upserts one close per date for admin/staff. Response `DailyClose`:
`{ id, business_date, aba_sales, total_sales, gross_profit, expenses, aba_balance, variance, notes, closed_by_name, closed_at }`.

- `GET /daily-closes?page=1&page_size=20&from=&to=`

## Wallet position

- `GET /wallet/position` → the shop's current ABA wallet position, readable by staff and admins.
```json
{
  "aba_balance": 57500,
  "expected_balance": 57000,
  "variance": 500,
  "as_of": "2026-11-06T18:30:00Z"
}
```
`aba_balance` is the recorded wallet balance (today's close if it exists, otherwise the latest close). `expected_balance` is ABA sales today minus expenses paid out of the wallet. `variance` is `aba_balance − expected_balance` when the balance is known.

## Fund requests

Money requested from the main ABA account to buy products/supplies. Staff create requests; admins review and disburse. All amounts in KHR.

- `GET /fund-requests?status=pending&mine=true&page=1&page_size=20` — staff see their own requests; admins see everything. Response `Paginated<FundRequest>` where `FundRequest` = `{ id, reference, amount, purpose, note, status, requested_by_name, reviewed_by_name, decision_note, reviewed_at, created_at }`. Status flow: `pending → approved → disbursed` (or `rejected`). Reference format `FR-YYYYMMDD-NNNN`.
- `GET /fund-requests/pending-count` → `{ pending: number }`
- `POST /fund-requests` — any user.
  ```json
  { "amount": 40000, "purpose": "Restock milk and jelly", "note": "optional" }
  ```
- `POST /fund-requests/{id}/review` — admin only; decision `approved` or `rejected` with optional note.
  ```json
  { "decision": "approved", "note": "Covers PO-20261111-0001" }
  ```
- `POST /fund-requests/{id}/disburse` — admin only; marks an approved request as sent from the ABA account.

## Expenses

Money already spent by the shop; deducted from ABA sales in the daily check. Categories: `restock | supplies | utility | other`.

- `GET /expenses?from=&to=&category=&page=1&page_size=20` — response `Paginated<Expense>` plus `sum` (total for the current filter). `Expense` = `{ id, business_date, category, description, amount, created_by_name, created_at }`.
- `GET /expenses/today` → `{ date: "2026-11-12", total: 20000 }`
- `POST /expenses` — any user.
  ```json
  { "business_date": "2026-11-12", "category": "supplies", "description": "Plastic bags and receipt rolls", "amount": 12000 }
  ```
- `DELETE /expenses/{id}` — admin only.

## Dashboard

- `GET /dashboard/summary` → today/yesterday revenue, profit, units, sales count, change percentages, low-stock count, out-of-stock count, active products, inventory value, ABA total.
- `GET /dashboard/sales-trend?days=7` → `[{ date, revenue, profit, units, sales }]`
- `GET /dashboard/category-mix?days=30` → category mix.
- `GET /dashboard/top-products?days=30&limit=5` → top products.
- `GET /dashboard/recent-activity?limit=8` → `[{ id, type, message, actor, created_at }]`

`DashboardSummary`:
```json
{
  "today": { "revenue": 44500, "gross_profit": 12000, "units_sold": 38, "sales_count": 21 },
  "yesterday": { "revenue": 38200, "gross_profit": 10500, "units_sold": 34, "sales_count": 18 },
  "revenue_change_pct": 16.5,
  "profit_change_pct": 14.3,
  "units_change_pct": 11.8,
  "profit_margin_pct": 27.0,
  "low_stock_count": 5,
  "out_of_stock_count": 2,
  "active_products": 22,
  "inventory_value": 1023300,
  "aba_total": 44500,
  "daily_close_done": false
}
```

## Reports

- `GET /reports/sales?from=&to=&group_by=day` → `[{ period, revenue, profit, units, sales }]`
- `GET /reports/staff-performance?from=&to=` → `[{ user_id, name, sales_count, revenue, units }]`

## Settings

- `GET /settings` → `{ store_name, dorm_name, currency, low_stock_default, receipt_footer, khqr_data }`
- `PATCH /settings` — admin only; partial fields. `khqr_data` holds the store's personal KHQR string (from their bank app) or a Bakong account id; it is the account payment QRs settle into.

## Payments

- `GET /payments/khqr?amount=&reference=` → `{ qr }` — builds a KHQR string locked to `amount` (and tagged with the sale `reference`), so the buyer can scan it with ABA, ACLEDA, Alipay, or any KHQR bank app and pay the exact total. Requires `khqr_data` to be configured; returns `409` otherwise.

## Storefront (customers)

- `GET /store/products?q=` → `{ items, total }` — the buyable menu: active products with price and availability. `stock_qty`/`stock_status` reflect the store display only; units held for counter sales are hidden. No cost prices or margins.
- `POST /store/checkout` — header: optional `Idempotency-Key`. Body `{ items: [{ product_id, quantity }], payment_method, notes? }`. Creates a `channel: "store"` sale through the same engine as the POS; availability and decrements are limited to `store_qty` (stock check `409`, movements). No discount — that is a staff decision.
- `GET /store/orders` — the signed-in customer's own purchase history.
- Returns the same `Sale` shape as `POST /sales`; for customer checkouts `sold_by_name` is the buyer.

## Errors

```json
{ "detail": "Not enough stock for Kulen (Big). Available: 1, requested: 2.", "code": "insufficient_stock" }
```
Status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` missing, `409` conflict/insufficient stock, `422` schema error, `500` server error.

## Demo accounts

- `admin@ministore.local` / `Admin123!`
- `staff@ministore.local` / `Staff123!`
- `customer@ministore.local` / `Customer123!` — sees the storefront only

## Roles

- **admin** — full access, every write.
- **staff** — reads the whole dashboard; no writes.
- **customer** — storefront only: `GET /store/products`, `POST /store/checkout`, `GET /store/orders`, plus `GET /payments/khqr` and own-password change. Every dashboard endpoint answers `403` for customers. Customer accounts are created and managed by admins in **Team**; there is no self-registration.

Email letters use a relaxed validation (simple `local@domain.tld` shape) rather
than Pydantic's `EmailStr`, because `.local` — the demo accounts' domain — is a
reserved special-use TLD that strict email validation rejects.
