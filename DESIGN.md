# Floqex Design System — "Soft Instrument, Dark"

The single source of truth for how Floqex looks and feels. Read this before
building or changing any UI, and keep every surface consistent with it. It adapts
the soft, rounded, grouped fintech-dashboard references (pill tabs, grouped
sidebar with chevrons, icon-prefixed floating panels, transaction rows, an
account top bar with search / notifications / settings / upgrade / avatar) into a
**premium dark-themed, single-accent** product.

## Workflow — do this every time you touch UI

1. **Always invoke the taste skill first.** Run `npx skills add Leonxlnx/taste-skill`
   and `npx impeccable install`, and load the `design-taste-frontend` skill, before
   any design work. No exceptions. It is the anti-slop discipline this product is
   held to.
2. State the one-line design read and set the dials (below) for the surface.
3. Build to the patterns in this document; keep it dark, sleek, and on the single accent.
4. Run the taste **Pre-Flight Check** and the checklist at the bottom of this file.
   If a box can't be ticked honestly, it is not done.

The goal bar: it must not look like AI slop, and it must feel good — match the
reference style exactly, in dark mode.

## Taste dials (per the taste skill)

This is product/dashboard UI, not a landing page. Hold these dials:

- **DESIGN_VARIANCE: 4** — structured, predictable layouts. Chrome and data views
  must be legible first; no artsy asymmetry in the app shell.
- **MOTION_INTENSITY: 4** — subtle, *motivated* motion only (menu/palette enters,
  hover/active feedback, draw-on for the equity line). Under 200ms. Always
  honor `prefers-reduced-motion`.
- **VISUAL_DENSITY: 5** — balanced. Data breathes; generous padding; no cockpit
  cramming, no art-gallery emptiness.

Marketing pages (`(marketing)/*`) may run hotter (VARIANCE 6-7, MOTION 5-6).

## Non-negotiable rules

1. **Dark Theme Primary**: The product is strictly **dark-locked**. The primary aesthetic is a deep, rich dark background with subtle elevated surfaces. `color-scheme: dark`. Light mode exists as a user preference in settings, but the default brand identity is dark.
2. **Gradient Accents**: The brand is anchored by a vibrant gradient blending light emerald, light blue, and light purple. Use the `@utility vibrant-mesh` and `aurora-breathe` utilities for structural background elements.
3. **One accent: emerald** `--color-accent` (deep emerald, legible on dark surfaces).
   Text on the accent uses `--color-on-accent` (black/white depending on contrast). Profit-green
   `--color-profit` is a *separate* token from the brand accent. Brand accent is
   for interactive/brand emphasis; profit/loss P&L uses `--color-profit` /
   `--color-negative`. Never color P&L with the brand accent.
3. **One radius system** (see below). No raw Tailwind `rounded-xl`/`rounded-md`
   or `shadow-sm`; always the tokens.
4. **Real data only.** No mock arrays, no "Jane Doe", no fabricated numbers.
   Empty/loading/error states instead. Demo numbers come from the seeded demo
   account via a labelled public read.
5. **Zero em-dashes** (`—`/`–`) in copy, headings, labels, and button text. Use a
   period, comma, or hyphen. The sole exception is a standalone `—` used as an
   empty-value placeholder in a metric/data cell (a standard dashboard convention).
6. **Accessibility is a gate.** Label-above-input, `:focus-visible` rings,
   WCAG AA contrast, never color-alone for state (pair with a text label/icon),
   keyboard paths for menus/dialogs, `prefers-reduced-motion` honored.
7. **Icons: Phosphor only**, ~1.5 weight; `fill` for the active/selected state.

## Tokens (defined in `src/app/globals.css` `@theme`)

Use the CSS variables / Tailwind tokens; never hardcode `oklch(...)` in components
(including SVG charts — use `var(--color-profit)` etc.).

**Surfaces (dark, cool-gray):** `base` (page) → `elevated` (cards/rails) →
`surface` (insets/controls) → `overlay` (popovers). Depth comes from elevation,
not shadow spam.

**Text:** `fg` (white/off-white) → `fg-muted` → `fg-subtle` → `fg-faint`.

**Accent:** `accent`, `accent-hover`, `accent-soft` (tint), `accent-ring`.
**Semantic:** `profit`/`positive` (P&L up), `negative`(+`-soft`), `warning`, `info`.
**Lines:** `line`, `line-strong`.

**Radius:** `--radius-control: 10px` (buttons, inputs, nav items, list rows),
`--radius-card: 18px` (cards, dialogs, dropdowns), `--radius-lg: 26px` (hero
panels), `--radius-pill: 9999px` (pills, badges, segmented, avatars, amount
chips). Small inner glyph squares use `8px`/`10px`.

**Shadows (tinted, never pure black):** `--shadow-sm/-md/-lg/-xl`. Card rule:
**border XOR shadow**, not both (cards use a 1px `border-line`; raised popovers
use a shadow).

**Easing/motion:** `--ease-out` `cubic-bezier(0.23,1,0.32,1)` for enters;
durations: control 100-160ms, popover/menu 125-200ms, dialog 180-260ms.

**Typography:** Geist + Geist Mono. `tabular-nums` + mono on all numbers
(use the `.tnum` helper). Headings tight tracking, `text-balance`.

## Visual world (used sparingly)

`glow-accent` (soft emerald radial) behind hero panels; `aurora` for
auth/shell backdrops; `grid-faint` dotted graph-paper behind data; `film-grain`
once at the shell. All honor `prefers-reduced-transparency`.

## Component patterns (the reference look, in dark mode)

- **App shell.** Fixed 240px sidebar (`bg-elevated`, `border-line`) at lg+, icon
  rail/bottom-nav below. Sticky topbar `h-14`, `bg-base/80 backdrop-blur`.
- **Sidebar.** Collapsible section headers (uppercase `fg-faint` label + rotating
  `CaretUp` chevron): Navigate / Accounts / Manage. Nav item = icon in a
  `rounded-[8px] h-7 w-7` square + label (`flex-1 truncate`) + trailing
  `CaretRight`. Active item: `bg-surface text-fg shadow-[var(--shadow-sm)]` with
  the icon square `bg-accent-soft text-accent` and `fill` icon. The Accounts
  section lists real accounts with live balances + an "Add account" dashed row.
  Bottom: avatar + name + sign out.
- **Topbar.** Left: account pill (`rounded-pill border bg-surface`, links to
  Accounts) + command-palette search button (`⌘K`). Right: live bot status dot,
  next-session countdown, Emergency Stop, divider, notifications bell, help menu,
  settings cog, Upgrade pill (`Star`, hidden on top plan), avatar.
- **Cards** (`ui/card`): `rounded-[var(--radius-card)] border border-line
  bg-elevated`. Hero/equity card may add a `glow-accent` backdrop layer.
- **Buttons** (`ui/button`): `rounded-[var(--radius-control)]`,
  `active:scale-[0.97]`. primary=`bg-accent text-[var(--color-on-accent)]`; secondary=`bg-surface
  border`; ghost; outline. Pills (Upgrade, account) use `--radius-pill`.
- **Segmented tabs** (`ui/segmented`): pill track `rounded-pill border bg-elevated
  p-1`; active option `bg-surface text-fg shadow-[var(--shadow-sm)]`. This is the
  Day/Week/Month and Operations/Income/Costs pattern.
- **Inputs** (`ui/input` + `ui/field`/`ui/label`): label above, optional leading
  `icon` and trailing adornment, `rounded-[var(--radius-control)] bg-surface
  border`, `focus:border-accent`. Errors below in `text-negative`.
- **Transaction rows** (recent trades, journal, notifications): icon in a soft
  `rounded-[10px] h-8 w-8` square (accent-soft for long, negative-soft for short)
  + name + time, amount in a tinted pill (`bg-profit/10 text-profit` or
  `bg-negative-soft text-negative`), row `hover:bg-surface/50`.
- **Dropdowns / menus** (notifications, help): `rounded-card border bg-elevated
  shadow-lg`, origin-aware enter (`scale .97 + opacity`, top-right origin),
  close on outside-click + Escape.
- **Command palette** (`⌘K`): centered dialog, search input + filtered nav list,
  arrow-key navigation, Enter to go, Escape/overlay to close.
- **Badges / status dots** (`ui/badge`): pill badges; `StatusDot` only for real
  state (bot status), pulse only when live.
- **Avatars:** real Clerk `imageUrl`, else initial on `accent-soft`. Never a
  stock "egg".

## States (every data surface ships all three)

- **Empty:** composed, explains how it fills (e.g. "Your bot narrates decisions
  here once it starts a session").
- **Loading:** skeletons matching final shape (`loading.tsx`), never a spinner.
- **Error:** inline `DashboardError` card, distinct from the empty state.

## Pre-ship checklist

- [ ] Dark Theme primary; emerald accent; vibrant light-emerald/blue/purple gradients applied appropriately.
- [ ] One radius system via tokens; no raw `rounded-*`/`shadow-*`.
- [ ] Zero em-dashes anywhere visible.
- [ ] Real data; empty/loading/error states present.
- [ ] Label-above-input; focus rings; AA contrast; not color-alone.
- [ ] Motion subtle + motivated + reduced-motion safe.
- [ ] Phosphor icons; `tnum` on numbers.
- [ ] `tsc`, `eslint`, `next build`, `vitest` all clean.
