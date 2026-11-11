# MiniStore Design System

## Direction

The reference image (TaskFlow) provides the layout language: a floating white sidebar, a soft mint canvas, rounded cards, oversized numerals, and a calm teal accent. MiniStore keeps that calmness but uses its own domain language: fridge stock, KHR revenue, restocking, and daily reconciliation.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--primary` | `#0FB5A0` | brand, active nav, primary buttons |
| `--primary-strong` | `#0A8F80` | hover, emphasis |
| `--mint` | `#E9F9F4` | tints, active nav background, decorative curves |
| `--canvas` | `#F5F7F6` | page background |
| `--card` | `#FFFFFF` | cards, sidebar |
| `--ink` | `#13211F` | headings |
| `--muted-foreground` | `#7A8B87` | secondary text |
| `--border` | `#E6EFEC` | hairlines |
| `--lavender` | `#AAB2F8` | chart bars |
| `--warning` | `#F3B34C` | low stock |
| `--destructive` | `#E25C5C` | out of stock, errors |
| `--success` | `#12A67A` | healthy stock, positive change |

- Radius: cards `28px` (`rounded-[28px]`), inner cards `18px`, pills `999px`.
- Shadow: `0 24px 60px rgba(20, 60, 50, 0.07)`.
- Fonts: Manrope for display/headings, Inter for body.
- Sidebar width: `248px`; desktop inset `20px`; content offset `288px`.
- KPI numerals: `text-4xl`/`text-5xl`, `font-display`, tight tracking.

## Layout rules

- Page canvas: `bg-canvas` with a subtle radial mint gradient in the top-right.
- Sidebar: fixed, floating, white, rounded `28px`, soft shadow.
- Top bar: transparent, pill search, notification button, avatar menu.
- Content: max-width `1600px`, `p-5` mobile, `p-7` desktop.
- KPI grid: 1 column mobile, 2 tablet, 4 desktop.
- Main dashboard grid: 8/4 columns; bottom row 3 equal cards.
- Every data surface needs loading, empty, and error states.
- Tables scroll horizontally on mobile; never clip actions.

## Component conventions

- Use `PageHeader` for route titles and primary actions.
- Use `StatCard` for KPI cards.
- Use `StatusBadge` for stock/sale/payment states.
- Use `EmptyState` and `ErrorState` instead of blank areas.
- Use `ConfirmDialog` for destructive actions (void, deactivate).
- Use `formatKHR` for every amount. Example: `12,500៛`.
- Use `formatDate` / `formatDateTime` / `relativeTime` for dates.
- Use teal for primary actions and positive trends; lavender for secondary chart series.
- Never use pure black or pure gray; use ink/muted tokens.

## Accessibility

- All icon-only buttons need `aria-label`.
- Dialogs must have a title and description.
- Focus rings use the brand color.
- Minimum touch target 40px.
- Tables use semantic `<table>` markup.
- Color is never the only status indicator; pair it with text.
