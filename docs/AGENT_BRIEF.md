# Sub-agent Brief — MiniStore

Read this before writing code. It defines the shared conventions every agent must follow.

## Stack

- Frontend: Next.js 16.4.5 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS v4, TanStack Query v5, React Hook Form + Zod, Recharts, Radix/shadcn primitives, `lucide-react`.
- Backend: Python 3.13, FastAPI, SQLAlchemy 2 async, Pydantic v2, Alembic, PyJWT, argon2-cffi.
- Local DB: `sqlite+aiosqlite:///./ministore.db`. Deployment DB: PostgreSQL 16 (`postgresql+psycopg://...`).
- Money is **integer KHR** everywhere. Never use floats for money.
- API base path `/api/v1`. The browser calls same-origin `/api/v1/...`; Next rewrites to FastAPI.

## Authoritative docs

- `docs/API_CONTRACT.md` — exact request/response shapes. Follow it. If something is missing, extend it in the same style and tell the lead in your final report.
- `docs/DESIGN_SYSTEM.md` — visual rules and tokens.
- `docs/PLAN.md` — architecture and ownership.
- `docs/reference/ministore-prototype.html` — original 22-product domain data and business logic (prices, categories, slots).

## Frontend conventions

### Imports and shared modules

- HTTP: `import { api, ApiError, toQuery } from "@/lib/api";`
  - `api.get<T>("/api/v1/products?page=1")`, `api.post<T>(path, body, init?)`, `api.patch<T>(path, body)`, `api.delete<T>(path)`.
  - `api.post`/`api.patch` JSON-encode `body`. Pass `{ headers: { "Idempotency-Key": ... } }` as third arg to `api.post`.
  - Paths MUST include `/api/v1`.
- Query keys: `import { queryKeys } from "@/lib/query-keys";` — use/extend only the keys relevant to your pages.
- Types: `import type { ... } from "@/types/api";` — do not duplicate types. If a type is missing, add it to `web/src/types/api.ts` only if the lead has not; prefer defining page-local helper types in your own files when they are presentation-only.
- Formatting: `formatKHR`, `formatNumber`, `formatDate`, `formatDateTime`, `formatTime`, `relativeTime`, `formatPercent`, `formatChange`, `getInitials`, `stockStatusMeta`, `saleStatusMeta`, `paymentMethodLabel`, `todayISO`, `monthKey`, `cn` — all from `@/lib/utils`.
- Auth/user: `useMe()` and `useLogout()` from `@/hooks/use-me`.
- UI primitives: `@/components/ui/*` (button, card, input, label, textarea, select, dialog, dropdown-menu, tabs, badge, table, skeleton, tooltip, switch, alert-dialog, separator, avatar, popover, sonner, sheet).
- Shared components: `@/components/shared/page-header` (`PageHeader`), `stat-card` (`StatCard`), `empty-state` (`EmptyState`), `error-state` (`ErrorState`), `table-skeleton` (`TableSkeleton`), `confirm-dialog` (`ConfirmDialog`), `status-badge` (`StatusBadge`, `StockStatusBadge`, `SaleStatusBadge`), `product-thumb` (`ProductThumb`), `section-card` (`SectionCard`), `data-pagination` (`DataPagination`).

### Styling tokens

Use the design tokens (already defined in `globals.css`):

- `bg-mint`, `text-brand`, `text-brand-strong`, `bg-brand`, `border-border`, `bg-card`, `text-ink`, `text-muted-foreground`, `bg-warning`, `text-destructive`, `bg-lavender`, `text-success`.
- Card surfaces: `className="card-surface"` (26px radius + shadow) or `card-surface-flat`.
- Headings use `font-heading`; body uses default `font-sans`.
- Buttons: prefer `rounded-full` pill style for primary actions.
- Never use raw hex colors unless matching chart colors from the API.

### Client components

- Pages that use hooks must start with `"use client";`.
- Wrap `useSearchParams()` usage in a `<Suspense>` boundary (Next requirement). Prefer local state over URL params for filters unless deep-linking matters.
- Use TanStack Query `useQuery` / `useMutation`. Invalidate relevant keys with `queryClient.invalidateQueries`.
- Every data screen needs loading (skeleton), empty (`EmptyState`), and error (`ErrorState`) states.
- Use `sonner`'s `toast` for success/error feedback.
- Forms use React Hook Form + Zod (`zodResolver`). Keep numeric fields as numbers; parse KHR integers with `z.number().int().nonnegative()`.
- All icon-only buttons need `aria-label`.
- Tables must be wrapped in `overflow-x-auto` and use semantic table components.
- Do not use `window` during render; guard client-only code.

### Next.js 16 caveats

- `middleware.ts` is replaced by `web/src/proxy.ts` (already written). Do not add middleware.
- `cookies()` is async in server code.
- `next.config.ts` has `turbopack` CSS rules and the `/api/:path*` rewrite. Do not change it.
- Do not add a root `src/app/page.tsx`; the dashboard overview is `src/app/(dashboard)/page.tsx`.
- Route group `(dashboard)` uses `src/app/(dashboard)/layout.tsx`, already written.

## Backend conventions

- App package: `api/app/` with `main.py`, `core/`, `models/`, `schemas/`, `api/v1/`, `services/`.
- Settings via `pydantic-settings`, reading `api/.env`.
- Async engine/session in `app/core/database.py`; dependency `get_db`.
- UUID primary keys (SQLAlchemy `Uuid`), `created_at`/`updated_at` UTC.
- Argon2 password hashing (`argon2.PasswordHasher`), JWT HS256, cookie name `access_token`, `httponly=True`, `samesite` from settings, `secure` from settings.
- Role checks: `require_admin`, `get_current_user`.
- All errors: `HTTPException(status_code=..., detail="...")`; where the contract specifies a `code`, raise a custom exception handler that returns `{"detail": ..., "code": ...}`.
- List endpoints return `{ items, total, page, page_size }` unless the contract shows a bare array.
- SQLite compatibility: only use `with_for_update()` on PostgreSQL (`if engine.dialect.name == "postgresql"`). Keep Alembic migrations portable.
- Seed script: `api/app/seed.py`, idempotent, runnable with `uv run python -m app.seed`.
- Tests: `api/tests/` using pytest + httpx ASGI transport, isolated SQLite database per test session.
- Ruff must pass: `uv run ruff check .` and `uv run ruff format --check .` (format your files).

## Ownership rules

- Only edit files inside your assigned paths. Do not touch `web/package.json`, `web/next.config.ts`, `web/src/app/globals.css`, `web/src/app/layout.tsx`, `web/src/app/providers.tsx`, `web/src/lib/**`, `web/src/types/api.ts`, `web/src/components/ui/**`, `web/src/components/shared/**`, or `web/src/components/layout/**` unless your role explicitly owns them.
- If a shared change is genuinely required, make the smallest possible edit and call it out in your final report.
- Do not run `npm install` / `uv add` unless necessary. If you need a dependency, report it instead of modifying manifests.
- Do not delete or modify `dashboard/` or `docs/reference/`.

## Verification before reporting

- Frontend: `npm run typecheck` from `web/`. Fix all errors in your files. `npm run lint` is optional but fix obvious issues.
- Backend: `uv run ruff check .`, `uv run pytest` from `api/`.
- Report: list every file you created/changed, any contract deviations, and anything the lead must wire up.
