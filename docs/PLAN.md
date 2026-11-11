# MiniStore Dorm Operations — Build Plan

## Confirmed decisions

| Decision | Choice |
|---|---|
| Primary users | Staff POS + admin dashboard |
| Scope | Preserve all five prototype views, plus POS, suppliers, analytics, settings |
| Local database | SQLite via `aiosqlite`; PostgreSQL 16 remains the deployment target |
| Migrations | Alembic, Postgres-compatible, runnable against SQLite locally |
| Currency | Cambodian Riel (`KHR`, symbol `៛`), integer amounts |
| Brand | MiniStore |
| Old files | Static prototype archived to `docs/reference/ministore-prototype.html`; `dashboard/` left untouched |

## Architecture

```text
Browser
  │
  ├── web/  Next.js 16 App Router :3000
  │      ├── /api/* rewrite ──────────────┐
  │      └── httpOnly access_token cookie  │
  │                                        ▼
  └── api/  FastAPI :8000  ── SQLAlchemy async ── PostgreSQL 16 / SQLite
                                   │
                                   └── Alembic migrations
```

- FastAPI sets the `access_token` httpOnly cookie. Next.js rewrites `/api/*` to FastAPI, so the browser sees a same-origin cookie.
- `web/src/proxy.ts` protects dashboard routes by checking cookie presence.
- `web/src/lib/api.ts` calls `/api/v1/*`; FastAPI validates the JWT and role.
- Staff can sell, restock, and close the day. Admin can also manage users, settings, and void sales.

## Domain model

| Table | Purpose |
|---|---|
| `users` | staff accounts, roles, hashed passwords |
| `categories` | product groups |
| `products` | SKU, prices, stock balance, threshold, fridge slot |
| `suppliers` | supplier contact records |
| `purchases` / `purchase_items` | restocking headers and lines |
| `sales` / `sale_items` | POS transactions and cost snapshots |
| `stock_movements` | append-only stock ledger |
| `daily_closes` | ABA reconciliation per business date |
| `activity_logs` | audit trail |
| `settings` | store name, dorm name, currency, thresholds, receipt footer |

Rules:

- KHR amounts and quantities are integers.
- `products.code` is unique. The prototype's duplicate codes are normalized by category prefix.
- Stock cannot go below zero.
- Checkout locks product rows with `SELECT ... FOR UPDATE` (PostgreSQL) inside one transaction.
- A sale stores the cost price snapshot per line so profit history is stable.
- Voiding a sale restores stock and writes reverse movements.
- Every stock change writes a `stock_movements` row.

## API surface

Base path `/api/v1`.

- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`
- Users: `GET/POST/PATCH /users` (admin)
- Categories: `GET/POST/PATCH/DELETE /categories`
- Products: `GET/POST/PATCH /products`, `GET /products/{id}`, `POST /products/{id}/adjust-stock`
- Suppliers: `GET/POST/PATCH/DELETE /suppliers`
- Purchases: `GET/POST /purchases`, `GET /purchases/{id}`
- Sales: `POST /sales`, `GET /sales`, `GET /sales/{id}`, `POST /sales/{id}/void`
- Stock: `GET /stock/summary`, `GET /stock/alerts`, `GET /stock/movements`, `GET /stock/monthly`
- Daily close: `GET/POST /daily-closes`, `GET /daily-closes/today`
- Dashboard: `GET /dashboard/summary`, `/dashboard/sales-trend`, `/dashboard/category-mix`, `/dashboard/top-products`, `/dashboard/recent-activity`
- Reports: `GET /reports/sales`, `GET /reports/staff-performance`
- Settings: `GET/PATCH /settings`
- Health: `GET /health`, `GET /ready`

All list endpoints return `{ items, total, page, page_size }`.

## Frontend routes

| Route | Contents |
|---|---|
| `/login` | Split-screen login, demo credentials |
| `/` | Reference-style overview dashboard |
| `/inventory` | Products, add/edit, stock adjustment, fridge map |
| `/sales` | POS + sales history + receipt |
| `/purchases` | Purchase list + add purchase |
| `/stock` | Stock position, alerts, category mix, monthly history |
| `/daily-check` | ABA reconciliation and close-day |
| `/suppliers` | Supplier CRUD |
| `/analytics` | Revenue, profit, top products, staff |
| `/settings` | Store, profile, team |
| `/help` | Quick start and shortcuts |

## Design direction

Adapt the reference image's layout and visual language, not its task-management content.

- Floating rounded white sidebar, teal active pill
- Soft mint radial gradients on the canvas
- 4 KPI cards with mint curved decoration
- Large rounded cards, subtle borders and shadows
- 7-day revenue bars (lavender) + profit line (teal) with mint area
- Right-column activity feeds
- Bottom row: restock CTA, stock-health rings, today's register
- Manrope headings, Inter body

## Sub-agent ownership

| Agent | Owns |
|---|---|
| Backend API | `api/**` |
| Web shell + overview | login, overview, settings, help, dashboard components |
| Inventory + purchases + suppliers | those routes, components, hooks |
| Sales + stock + daily check + analytics | those routes, components, hooks |
| QA + integration | tests, e2e, QA docs |

Shared files (`package.json`, `globals.css`, root layout, providers, UI primitives, API client, shared types, shell) stay with the lead.

## Definition of done

- `uv run alembic upgrade head` and seed work from clean.
- `uv run pytest` passes.
- `npm run lint`, `npm run typecheck`, `npm run build` pass.
- Playwright smoke: login, dashboard, add product, restock, sale, void, daily close, analytics.
- Desktop and mobile screenshots reviewed against the reference.
- README documents setup, migrations, seed, and demo credentials.
