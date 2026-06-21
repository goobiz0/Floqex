# Floqex — Master Plan: How the Product Works, End to End

## 1. Context

Floqex is a SaaS platform for **automated, transparent algorithmic trading**. A user signs up, connects a broker account (paper or live), configures a strategy with no code, and a bot trades autonomously inside hard risk guardrails while narrating every decision into a live feed. The product spans three domains:

| Domain | Role |
| --- | --- |
| `floqex.com` | Marketing / landing (public) |
| `accounts.floqex.com` | Authentication — custom pages powered by Clerk (not Clerk-hosted UI) |
| `dashboard.floqex.com` | The product — overview, bots, journal, strategy lab, analytics, accounts, billing, settings |

**Why this plan exists.** The vision + a strong design system already live in Notion, and the codebase has the bones (Next.js 16.2.9, React 19, Clerk 7, Prisma 6 + Supabase Postgres, a Python engine, Tailwind v4 OKLCH tokens). Three things are wrong today and this plan fixes them:

1. **Subdomains don't truly work.** `src/proxy.ts` only rewrites the **root** of each subdomain and Clerk's URLs are path-based, so deep links and after-auth redirects bounce between hosts. We need native subdomain apps with clean URLs and one shared session.
2. **Auth uses Clerk's prebuilt `<SignIn/>`/`<SignUp/>` widgets** (themed in `src/app/layout.tsx`). The user wants **custom-designed** auth pages that *use* Clerk's backend via headless hooks.
3. **The UI is bland and fake.** Every dashboard number is a hardcoded mock — inline `METRICS`/`RECENT` arrays in `src/app/dashboard/page.tsx`, a central `src/lib/mock-data.ts`, and a `mulberry32` random walk in `src/components/dashboard/equity-curve.tsx`. The product must run on **real data** (engine → Postgres → UI), real Clerk auth, real broker connections, real computed metrics. Paper trading is still *real* (real market data, real simulated executions); we remove only hardcoded placeholder data.

**Intended outcome:** one Next.js app serving three native subdomains, custom Clerk auth, a redesigned "emerald, elevated" dark visual system applied consistently across every page and screen size, and a real data pipeline so nothing on screen is faked.

**Design direction (locked):** "Precision instrument, not navy-and-gold fintech." Dark-only (light mode later). Single brand accent **emerald `oklch(0.696 0.17 162)` ≈ `#10B981`**, with **profit kept distinct from brand** (`--color-profit ≈ #34D399`) so the accent never collides with P&L; loss `--color-negative ≈ #F2555A`. Geist + Geist Mono, Phosphor icons, one radius scale (8/12/full), restrained-but-alive motion. Every surface validated against **taste** (anti-slop), **impeccable** (craft), **Emil Kowalski** (motion) — encoded below so the build can't drift into slop.

---

## 2. Guiding Principles (apply to every task)

1. **Real over mock — non-negotiable.** No component ships with hardcoded business data. Every figure traces to Postgres (Prisma), Clerk, or Supabase Realtime. No data yet → a **composed empty state**, never fake data. A labeled **demo account** (a real paper bot the engine runs) powers the marketing preview — real data, not a mock.
2. **One app, three native subdomains.** Host-aware routing in `src/proxy.ts` (Next 16 renamed middleware → `proxy.ts`). One Clerk session across `*.floqex.com`.
3. **Custom auth, Clerk backend.** Headless hooks (`useSignIn`, `useSignUp`, `useClerk`, `useAuth`, `setActive`). No prebuilt widgets, no Account Portal redirects.
4. **Use the real tokens.** Extend the existing `--color-*`, radius, shadow, and easing tokens in `src/app/globals.css`; don't invent a parallel set or hardcode raw `oklch(...)` in components (tokenize the equity chart's colors).
5. **Dark-locked, one of everything.** One accent (emerald), one radius scale, one type pair (Geist), one icon set (Phosphor regular @ 1.5). Profit-green is a separate token from brand-emerald.
6. **Motion is motivated.** Emil easing, <300ms on UI, enters from `scale(0.96)+opacity` (never `scale(0)`), origin-aware popovers, **high-frequency updates (agent feed, ticks) don't animate**, all behind `prefers-reduced-motion`.
7. **Responsive by contract.** Every multi-column layout declares its `<768px` fallback. Breakpoints 640/768/1024/1280/1536. Dashboard: full sidebar ≥1024, icon rail 768–1023, bottom nav <768. `min-h-[100dvh]`, never `h-screen`.
8. **Next.js 16 ≠ training data.** Per `AGENTS.md`, read `node_modules/next/dist/docs/` if present; otherwise follow proven repo patterns (`proxy.ts` uses `clerkMiddleware`, `req.nextUrl`, `NextResponse.rewrite`, `auth.protect()`, `config.matcher`). Verify the rewrite API against the installed version.
9. **Accessibility is a gate.** WCAG AA contrast, `:focus-visible` rings (present), label-above-input, inline errors, keyboard paths, never color-alone for P&L (pair with +/- and icon), reduced-motion + reduced-transparency honored.

---

## 3. System Architecture

### 3.1 Topology

```
   Browser (*.floqex.com)
        │
        ▼
   ┌─────────────────────────────────────────────┐
   │ Single Next.js 16 app (Vercel)              │
   │ src/proxy.ts = host-aware router + Clerk     │
   │ Server Components + Server Actions (Prisma)  │
   └───────────────┬─────────────────────────────┘
                   │ Prisma (pooled DATABASE_URL)
                   ▼
   ┌─────────────────────────────────────────────┐
   │ Supabase Postgres = source of truth          │
   │ users, accounts, bots, strategies, trades,   │
   │ bot_adjustments, daily_summaries, news_events│
   │ + connections, agent_events, user_settings   │
   └───────────────▲─────────────────────────────┘
                   │ writes trades/summaries/heartbeat/narrative/adjustments
                   │ reads active bots + strategy params each cycle
   ┌───────────────┴─────────────────────────────┐
   │ Python engine = separate worker (/engine)    │
   │ Yahoo feed → ORB → risk → paper fills →       │
   │ screenshots → persistence → agent narration  │
   └─────────────────────────────────────────────┘

   Auth:     Clerk prod instance (clerk.floqex.com); session shared on .floqex.com
   Realtime: Supabase Realtime (RLS via Clerk JWT) → live dashboard surfaces
   Storage:  Supabase Storage bucket (chart screenshots)
   Billing:  Clerk Billing (plans + has() gating)
```

The **database is the contract** between engine and web app. The web app never calls the engine; the engine writes results, the dashboard reads them (initial load via Prisma Server Components, live updates via Supabase Realtime).

### 3.2 The "real data" pipeline (what makes it not-fake)

1. **Engine** loads active bots + strategy params from Postgres each cycle, and per active account in a live session: pulls 1-min bars (Yahoo `GC=F`/`NQ=F`/`ES=F`), builds the opening range, evaluates ORB with range-health/news/trend gating, sizes to the configured risk %, simulates fills (0.02% slippage), captures entry/exit screenshots, and **writes**: a `Trade` on close (MFE/MAE, R, buckets, narrative, screenshotUrl), per-decision `AgentEvent` rows, a `DailySummary` at session close, `Bot.lastHeartbeat`/`status` each cycle, `BotAdjustment` from the evidence loop.
2. **Web app** Server Components query Prisma for the signed-in user and compute all metrics via `src/lib/metrics.ts` (no metric hardcoded).
3. **Live surfaces** (bot status, live position, agent feed, today's P&L, countdown) subscribe to **Supabase Realtime**; fallback to `revalidate`/poll.
4. **Demo account** ("Floqex Demo", real `PAPER`) trades continuously; a public read-only query powers the marketing preview, labeled as a demo.

### 3.3 Engine completion (precise gaps — more built than it looks)

`/engine/floqex_engine` already implements **real logic**: ORB signal + range-health (`strategy/orb.py`), the risk engine — sizing, daily-loss cap, trade caps, benching (`risk.py`), paper fills + MFE/MAE + R (`execution.py`), news blackout (`news.py`), session state machine with staleness/news gating (`session.py`), narration (`agent_feed.py`). `runner.py` wires a synthetic NY session and **prints to stdout**. Gaps to make data real:

- **Persistence (new):** write `Trade`/`DailySummary`/`Bot` heartbeat+status/`AgentEvent`/`BotAdjustment` to Postgres (psycopg/SQLAlchemy). `types.py` Trade already mirrors the Prisma `Trade` shape.
- **Real feed:** swap `SyntheticFeed` → Yahoo adapter with the 10-min staleness guard + fallback ladder (Yahoo → broker API (live) → last-known-good cache → skip+alert).
- **Scheduler/worker:** read active bots + params from DB, run Asia + NY on the real clock (IANA `Asia/Tokyo`, `America/New_York`, DST-safe), honor holidays, carry daily caps across both sessions, respond to Emergency-Stop.
- **Screenshots:** chart with OR + entry/stop/target (matplotlib or headless Playwright) → Supabase Storage → URL on the trade; non-blocking on failure.
- **Deploy:** background worker + scheduler (Railway/Render/Fly, or VPS cron/systemd). Heartbeat drives truthful RUNNING/WAITING/STOPPED.

Live broker execution (Alpaca first) is a later phase; **paper is the MVP and is fully real**.

### 3.4 Reliability & safety (exact rules; enforced server-side; never bypassable by the bot)

- **Risk/trade:** default 0.5–1%; user-tunable **0.1–2%** (hard ceiling 2%); stop-distance sizing.
- **Daily loss:** default 3%; user **1–5%** (ceiling 5%); server-side circuit breaker force-closes + blocks at the cap.
- **Trade caps:** **4/session**, **8/day**, **2 open** (user 1–10 / 1–20 / 1–5); daily counts carry across Asia + NY.
- **Instrument benching:** **4 consecutive losses** benches for the day (user 2–10); resets on a win.
- **Leverage/notional 20× — hard-coded.** Position-sizing formula and "bot cannot edit risk" are hard-coded.
- **Emergency Stop** on every screen → flatten + halt (writes STOPPED, engine honors next cycle; live cancels/flattens via broker).
- **Heartbeat monitoring** (stale → degraded UI + alert), **balance reconciliation** at session start/end (mismatch pauses), broker creds **AES-256 at rest** (`Connection` model; secrets never sent to client).

---

## 4. Domains, Routing & Subdomains

### 4.1 The fix — host-aware path translation

Keep internal paths **namespaced** (`/dashboard/*` product, `/sign-in|/sign-up|/forgot-password|/sso-callback` auth, `/` marketing); `proxy.ts` translates clean subdomain URLs to internal paths while preserving the visible URL:

| Public URL (prod) | Internal | Host rule |
| --- | --- | --- |
| `floqex.com/...` | unchanged | apex/localhost = path-based |
| `dashboard.floqex.com/` | `/dashboard` | prefix `/dashboard`, protect |
| `dashboard.floqex.com/journal` | `/dashboard/journal` | prefix `/dashboard`, protect |
| `dashboard.floqex.com/onboarding` | `/dashboard/onboarding` | prefix, protect |
| `accounts.floqex.com/` | `/sign-in` | map root → sign-in |
| `accounts.floqex.com/sign-up` | `/sign-up` | served natively |
| `accounts.floqex.com/<non-auth>` | redirect `/sign-in` | confine accounts host to auth |

Refined `proxy.ts` (extends existing `productSubdomain()` + `clerkMiddleware`):

```
clerkMiddleware(async (auth, req):
  sub = productSubdomain(host)            // "", "dashboard", "accounts"
  path = req.nextUrl.pathname
  if sub == "dashboard":
     await auth.protect()
     if !path.startsWith("/dashboard"): rewrite → "/dashboard" + (path=="/" ? "" : path)
     return
  if sub == "accounts":
     if path == "/": rewrite → "/sign-in"
     elif path not in AUTH_PATHS: redirect → "/sign-in"
     return
  if isProtectedRoute(req): await auth.protect()   // apex/localhost path-based
)
```

Move onboarding to `/dashboard/onboarding`; keep the matcher covering `/dashboard(.*)`. **Localhost/preview stay path-based.**

### 4.2 Shared session across subdomains (Clerk) — no satellite needed

All three hosts are subdomains of one site, so use **one Clerk prod instance** (`clerk.floqex.com`); Clerk shares the session across subdomains when the cookie is scoped to `.floqex.com`. This is **not** the satellite-domains case. Set Clerk URLs **absolute** so nothing resolves to the wrong host:

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://accounts.floqex.com/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://accounts.floqex.com/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=https://dashboard.floqex.com
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=https://dashboard.floqex.com/dashboard/onboarding
```

Local `.env.local` uses path-based values. Add `src/lib/urls.ts` (`marketingUrl()`, `authUrl(path)`, `dashboardUrl(path)`) returning absolute subdomain URLs in prod and path-based in dev (env-keyed), used by every cross-surface link and sign-out (`signOut({ redirectUrl: marketingUrl() })`).

### 4.3 Consolidated route map

```
floqex.com (marketing — static/ISR)
  /                     home (real demo preview)
  /pricing /how-it-works /security
  /terms /privacy /risk-disclosure
  sitemap.ts · robots.ts · opengraph-image

accounts.floqex.com (auth — custom Clerk, dynamic)
  /sign-in /sign-up /forgot-password /sso-callback

dashboard.floqex.com (product — protected, dynamic per-user)
  /                     overview            (internal /dashboard)
  /bots /journal /strategy /analytics
  /accounts /billing /settings /profile
  /onboarding           first-run wizard
  api/webhooks/clerk     (user sync)

Per segment: loading.tsx (skeleton), error.tsx (inline recovery), not-found.tsx.
```

### 4.4 Cross-surface flow

```
floqex.com ─"Get started"→ accounts.floqex.com/sign-up
   │  Clerk creates user → webhook upserts users row
   ▼
dashboard.floqex.com/dashboard/onboarding (protected)
   │  connect account · pick strategy · set risk · activate bot
   ▼
overview.  Sign in → /sign-in → dashboard.  UserButton ▸ Sign out → floqex.com
```
If a signed-in user has **no account**, dashboard guards redirect to `/dashboard/onboarding`.

---

## 5. Authentication — Custom Pages, Clerk Backend

**Approach:** custom forms styled to our system, wired to Clerk headless hooks. Clerk handles passwords, OAuth (Google/GitHub/Apple), email-code verification, MFA, reset, sessions. Skills: `clerk-custom-ui`, `clerk-nextjs-patterns`, `clerk-react-patterns`.

### 5.1 Pages on `accounts.floqex.com`

- **`/sign-in`** — `useSignIn`: email+password, social via `authenticateWithRedirect({ redirectUrl:'/sso-callback', redirectUrlComplete: dashboardUrl() })`, forgot-password link, link to sign-up. On `status==='complete'` → `setActive` → redirect.
- **`/sign-up`** — `useSignUp`: name/email/password + social, then **email OTP** (`prepareEmailAddressVerification({strategy:'email_code'})` → custom 6-segment input → `attemptEmailAddressVerification`). **Gotcha:** include `<div id="clerk-captcha" />` so Smart CAPTCHA/bot protection works in a custom flow. On complete → `setActive` → onboarding.
- **`/forgot-password`** — `signIn.create({strategy:'reset_password_email_code'})` → code + new password → `setActive`.
- **`/sso-callback`** — `<AuthenticateWithRedirectCallback/>` with a "completing sign-in" state.
- **`auth-shell`** — redesign `src/app/(auth)/layout.tsx`: two-pane ≥1024 (left brand panel = aurora+grain + **real demo equity sparkline** + three value props; right form), single column <1024; keep risk disclaimer.

### 5.2 Wiring & states

- Replace the `[[...sign-in]]`/`[[...sign-up]]` widget pages with custom components in `src/components/auth/` (`sign-in-form`, `sign-up-form`, `forgot-password-form`, `otp-input`, `social-buttons`, `auth-shell`).
- In `src/app/layout.tsx`, drop prebuilt-widget appearance/options; keep a minimal `dark` appearance only for `<UserButton/>`; `@clerk/ui` otherwise removable.
- Map Clerk error codes → friendly inline field errors; full state cycle (idle/loading/disabled+spinner/error/success).
- **Keep** the webhook (`src/app/api/webhooks/clerk/route.ts`, upserts/deletes `users`); point it at `https://dashboard.floqex.com/api/webhooks/clerk`; verify with `CLERK_WEBHOOK_SIGNING_SECRET`.

---

## 6. Design System — "Emerald, Elevated"

Refine `src/app/globals.css` (Tailwind v4 `@theme`, OKLCH); don't re-architect.

### 6.1 Tokens (extend the real ones)

Keep existing `--color-base/elevated/surface/overlay`, `--color-fg/-muted/-subtle/-faint`, `--color-accent/-hover/-soft/-ring`, `--color-negative[-soft]`, `--color-warning`, `--color-info`, `--color-line[-strong]`, radii (8/12/full), tinted shadows, easing. Changes:

- **Add `--color-profit: oklch(0.78 0.15 162)` (≈ `#34D399`)** and remap `--color-positive` → profit so **profit ≠ brand-accent**. Brand stays `--color-accent oklch(0.696 0.17 162)`. Loss = `--color-negative`. Audit P&L usages (`text-positive`, `bg-accent-soft`) and switch P&L to `text-profit`.
- Optionally deepen base to `oklch(0.10 0.005 260)` to match `viewport.themeColor`.
- Charts read tokens (`var(--color-profit)`, `var(--color-line)`) — fix the hardcoded `oklch(...)` in `equity-curve.tsx`.

### 6.2 The "visual world" (kills the slop)

Restrained bespoke layer, used consistently (extends existing `glow-accent` + `grid-faint`):

- **Aurora/mesh accent** behind hero, auth panel, dashboard shell, section anchors — layered emerald radial gradients, low opacity, never neon; honors `prefers-reduced-transparency`.
- **Film grain** — one fixed `pointer-events-none` overlay at low opacity at the shell; never on scrolling containers.
- **Instrument textures** — dot-grid/hairline "graph paper" behind data; mono tick labels; thin framing rules.
- **Depth via elevation, not shadow spam** — base→elevated→surface→overlay; tinted shadows only where elevation is real; **never `border`+`box-shadow` together**.
- **Bespoke data-viz (real, tokenized):** equity curve (SVG via `d3-scale`/`d3-shape`, gradient area, `pathLength` draw-on, hover crosshair w/ tabular-num readout), sparklines, Journal **calendar heatmap**, Analytics (R-distribution, underwater drawdown, by-session/instrument/weekday/bucket). No generic chart-lib defaults.

### 6.3 Type, components, motion

- **Type:** Geist + Geist Mono (loaded), 1.25 scale, display 600/tight, body ~1.55/≤65ch, `tabular-nums` on data, `text-wrap: balance` headings. Never Inter.
- **Components:** keep+upgrade `ui/{button,card,badge,switch}`; add `input,label,field,select,slider,dialog,drawer,tooltip,tabs,segmented,skeleton,toast,empty-state,stat,data-table`. One radius; buttons `:active{scale .97}`.
- **Motion (Emil):** `--ease-out/-in-out/-drawer` (present); durations button 100–160 / popover 125–200 / dropdown 150–250 / modal 200–350 / page 250–400ms; numbers count-up on first load only; agent feed/ticks don't animate; `motion/react`, continuous via `useMotionValue`/`useTransform`; reduced-motion everywhere.

### 6.4 Anti-slop gate (every page)

Asymmetric layouts (no 3 identical cards), ≤1 eyebrow per 3 sections, **zero em-dashes**, real images / real component previews (no div-fake screenshots), single accent, one radius, dark on every section, label-above-input, full empty/loading/error states, AA contrast, responsive at all five breakpoints, "AI made this?" → no.

---

## 7. Data Model & Server Layer

### 7.1 Prisma additions (`prisma/schema.prisma`)

Keep existing models (`User`, `Account`, `Bot` — `autoAdjustmentsUsed` already exists for the "X/15" meter, `Strategy.params Json`, `Trade` with MFE/MAE/buckets/narrative/screenshotUrl, `BotAdjustment`, `DailySummary` unique `(accountId,date)`, `NewsEvent`). Add:

- **`Connection`** — `accountId`, `provider`, `encrypted` (ciphertext), `status`, `lastVerifiedAt`. AES-256-GCM.
- **`AgentEvent`** — `botId`, `accountId`, `ts`, `kind (INFO|SIGNAL|TRADE|RISK|NEWS|ADJUST)`, `message`, `tradeId?`; index `(accountId, ts)`. Powers the live feed (`Trade.narrative` stays the trade-level summary).
- **`UserSettings`** — `userId` unique, notification prefs, `discordWebhookUrl?`, alert thresholds, timezone, export prefs.
- Add `(accountId, session)` / `(accountId, instrument)` indexes if query plans need them.

Migrate with `npx prisma migrate dev` (`DIRECT_URL`); app uses pooled `DATABASE_URL`. Add `prisma/seed.ts` to create the demo user/account/strategy/bot.

### 7.2 Canonical Strategy params (contract: Strategy Lab ↔ engine)

`Strategy.params` JSON is rendered by Strategy Lab and consumed by the engine. Define a shared **zod schema** `src/lib/strategy-schema.ts` mirroring the engine's `DEFAULT_PARAMS`/`DEFAULT_RISK`/session config, bounds enforced **client- and server-side**:

- **ORB:** `openingRangeMinutes` (15), `rangeHealthMin`/`Max` (~0.3×–3×), `rewardRiskTarget` (2R), `reEntry` (toggle), `trendFilter` (toggle + `maPeriod` 20).
- **Sessions (ASIA, NY):** `enabled`, `openTime`+`durationHrs`, `openingRangeMinutes`, `instruments[]` (subset of account's enabled set), `holidayRegion`. Asia=Gold 09:00–13:00 Tokyo; NY=Gold/NQ/ES 09:30–16:00 ET.
- **Risk controls (§3.4 bounds):** `riskPct` 0.1–2, `dailyLossPct` 1–5, `maxTradesSession` 1–10, `maxTradesDay` 1–20, `maxOpen` 1–5, `benchStreak` 2–10. Daily caps carry across sessions.

Saving writes a new `Strategy.version` + a `BotAdjustment(source=USER)` Change-Log row with old→new diff.

### 7.3 Metrics (single source — supersedes `mock-data.ts`)

`src/lib/metrics.ts` (pure, unit-tested) computes from real `Trade[]`/`DailySummary[]`, keeping `mock-data.ts` function names so the swap is mechanical: `summaryMetrics` (winRate, profitFactor=grossProfit/grossLoss, avgWin, avgLoss, totalPnl, count), `dailyPnl`, `byInstrument`, `bySession`, `byWeekday`, `rDistribution` — **plus** `maxDrawdown` (peak-to-trough on the equity series, % and $), `expectancy` (mean R), and `equitySeries` (from `DailySummary.endBalance` ordered by date, timeframe-sliced) to replace the chart's `makeSeries`. Delete `src/lib/mock-data.ts` and the in-chart `mulberry32`.

### 7.4 Queries, realtime, crypto, actions

- `src/lib/queries/*` — typed Prisma reads scoped to the Clerk user (`auth()` → `users.clerkId`); a public demo read for marketing. **Serialize `Decimal` → number/string at this boundary** (Prisma `Decimal` isn't client-serializable).
- `src/lib/realtime.ts` — Supabase Realtime client + typed channels (bot status, live position, agent feed, today's P&L). Enable replication on those tables.
- `src/lib/crypto.ts` — AES-256-GCM via Node `crypto` + `ENCRYPTION_KEY` (server-only).
- **Server Actions** for mutations (save strategy, start/stop bot, emergency-stop, connect/test account, approve/reject adjustment, update settings) — each authorizes the Clerk session and re-validates with the zod schema. Reuse `src/lib/db.ts` (Prisma singleton) and `src/lib/utils.ts` `cn`.

---

## 8. Security, Data Isolation & Compliance

- **Realtime isolation (important):** browser→Supabase Realtime uses the public anon key, so rows MUST be protected by **Row-Level Security**. Wire **Clerk as a Supabase third-party auth provider** (Supabase accepts the Clerk JWT) and write RLS policies keyed on `auth.jwt()->>'sub' = users.clerkId` (joined through account ownership) so a client can only subscribe to its own data. Simpler MVP fallback: proxy realtime through a Next **SSE** route authorized server-side via Clerk (browser never touches Supabase directly). Either way, **no table is client-readable without an ownership check.**
- **Writes** all go through Server Actions / the engine (service connection); the browser never writes directly.
- **Secrets:** `CLERK_SECRET_KEY`, `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, DB URLs are server-only; only `NEXT_PUBLIC_*` reach the client. Broker creds encrypted at rest; decrypted only in the engine for live orders (shared key via `cryptography` in Python).
- **Webhook** signature verified (`CLERK_WEBHOOK_SIGNING_SECRET`); Server Actions are CSRF-safe by Next's origin checks; Clerk rate-limits auth.
- **Demo read scope:** a single fixed demo account id (env), read-only, no PII; expose only equity/trade aggregates.
- **Compliance/disclaimers:** keep the "software, not financial advice" disclaimer; ship `/risk-disclosure`; live trading later needs jurisdiction checks + broker T&Cs (funded/KYC even later). Paper-only MVP keeps the compliance surface small.

---

## 9. Rendering, Caching & the Engine↔DB Contract

- **Rendering:** marketing = static/ISR (demo preview ISR with short `revalidate`); auth + dashboard = **dynamic per-user** (calling `auth()` opts pages out of the full-route cache). Use skeletons (`loading.tsx`) to avoid CLS; never statically cache authed data.
- **Engine↔DB contract:** **Prisma owns the schema** (migrations). The Python engine writes via SQL/ORM to the same tables and **must use identical enum strings** (`RUNNING`/`WAITING`/`STOPPED`, `ASIA`/`NY`, `LONG`/`SHORT`, `OPEN`/`CLOSED`, `BOT`/`USER`, `APPLIED`/`PENDING`/`REJECTED`, `LOW`/`MEDIUM`/`HIGH`). Document this parity in `/engine/README.md` (or generate constants from the schema). Writes are **idempotent** (upsert `DailySummary` on `(accountId,date)`; insert each `Trade` once on close). The scheduler wakes each minute inside session windows, pre-pulls holiday/news calendars, **reads each bot's params fresh every cycle** (so Strategy Lab edits apply next cycle), and respects STOPPED + benching state.
- **Seeding/local dev:** `prisma/seed.ts` creates the demo account + default ORB strategy; document running the engine locally against a Supabase dev DB; `.env.local` mirrors prod keys with path-based Clerk URLs.

---

## 10. Page-by-Page Specification

Each page names its **real data source** and ships **empty / skeleton-loading / inline-error** states (Next.js `loading.tsx`/`error.tsx`/`not-found.tsx`).

### 10.A Marketing — `floqex.com`
- **Nav/Footer:** redesign `marketing/marketing-nav` (single-line ≤72px; Product/How it works/Pricing/Security; "Sign in" ghost + "Get started" emerald via `authUrl()`; mobile sheet) and `marketing/footer`. Aurora+grain, dark-locked.
- **Home** (`(marketing)/page.tsx`): asymmetric hero (≤2-line headline, ≤20-word subtext, primary+secondary CTA) + **real live mini-dashboard preview** (demo equity sparkline + bot status via public read); broker trust strip (real SVG logos: Alpaca/OANDA/IBKR/Tradovate); How-it-works (Connect → Configure no-code → Run); transparency/Agent-Feed sample (demo); risk-first guarantees; bounded self-improvement (≤15 auto-adjustments); pricing preview; final CTA. Reuse/upgrade `marketing/reveal`.
- **`/pricing`** (Clerk Billing plans), **`/how-it-works`** (from §11), **`/security`**, **legal** `/terms` `/privacy` `/risk-disclosure`; `sitemap.ts`/`robots.ts`/OG. Later: `/changelog`, `/status`.

### 10.B Auth — `accounts.floqex.com`
Per §5. Data: Clerk (live), demo sparkline (real). Full state cycle + inline Clerk error mapping + CAPTCHA element.

### 10.C Product — `dashboard.floqex.com`
**App shell** (`dashboard/layout.tsx` + `dashboard/nav` + `dashboard/topbar`): sidebar ≥1024 (Overview, Bots, Journal, Strategy, Analytics, Accounts, Billing, Settings + account/bot switcher + `UserButton`), icon rail 768–1023, bottom nav <768. Topbar: account/bot switcher, **real heartbeat status**, **real next-session countdown** (`dashboard/countdown`, market tz + user tz), **Emergency Stop** (`dashboard/emergency-stop` → action). Subtle aurora/grain. Focus-trapped dialogs, keyboard-navigable switcher, skip-to-content.

1. **Onboarding** (`dashboard/onboarding`): Welcome → Connect (Paper instant / broker keys) → Choose strategy (ORB defaults) → Set risk (bounded) → Activate. Writes real `Account`+`Strategy`+`Bot`; AnimatePresence steps + validation.
2. **Overview** (`dashboard/page.tsx`, **de-mock**): replace inline `METRICS`/`RECENT` + the `EquityCurve`/`LivePosition`/`AgentFeed` mocks with real Server-Component data + Realtime — equity hero, real equity curve (`equitySeries`), bot status (heartbeat), live position (open trade + screenshot + MFE/MAE), 6 metric cards (`metrics.ts`), agent feed (`AgentEvent`, no per-item animation), recent trades (real → trade-detail drawer). Recolor P&L to `text-profit`/`text-negative`.
3. **Bots** (`dashboard/bots`, new — multi-bot hub): per-bot cards (status, account, strategy, today's P&L, real sparkline); create bot, **clone strategy to a new bot**, start/stop, plan-gated count.
4. **Journal** (`dashboard/journal` + `journal-view`): **calendar heatmap** (`dailyPnl`), day filter, full trade table (all real `Trade` fields), row → **trade-detail drawer** (screenshot, narrative, MFE/MAE, buckets). Empty state when no trades.
5. **Strategy Lab** (`dashboard/strategy` + `strategy-lab`): renders the zod schema (§7.2) as labelled controls in three groups (ORB · Session Config · Risk Controls) with bounds + helper text + confirm-on-save; **Change Log** tab (timeline of `BotAdjustment` diffs, bot vs user, evidence, "X / 15 auto-adjustments used" from `Bot.autoAdjustmentsUsed`); **Approval Queue** tab (pending suggestions: sample size, win-rate delta, confidence → Approve/Reject action). Phase 3: paste/"vibe-code" strategy → auto-extract a param schema → same UI (bounds enforced).
6. **Analytics** (`dashboard/analytics` + `charts`): underwater drawdown, win rate / profit factor / expectancy, R-distribution, by session/instrument/range-bucket/entry-time/trend-agreement, streaks; date-range + account filters; insufficient-data states. All from `metrics.ts`.
7. **Accounts** (`dashboard/accounts` + `accounts-view`): connected accounts (broker/mode/balance/status/attached bot); Connect flow (Paper instant; broker keys, Alpaca first) with **test-connection**; `Connection` encrypted; secrets never returned.
8. **Billing** (`dashboard/billing`, new): plan, usage vs limits, invoices, upgrade via Clerk Billing drawer; `has()` gating.
9. **Settings** (`dashboard/settings` + `settings-view`): notifications (Discord webhook the engine posts to), alert thresholds, CSV export of real trades, security (Clerk sessions/MFA), timezone, danger zone. Data: `UserSettings` + Clerk.
10. **Profile** (`dashboard/profile`, new): personal info (Clerk) + a **clearly-disabled** deposits/withdrawals placeholder for the funded phase (no fake balances).
11. **Trade detail** — reusable drawer/modal (full-screen sheet <768), real record + screenshot + narrative.

---

## 11. Trading Rules Reference (canonical)

- **Strategy (ORB):** OR = first 15 min (high/low). Long on 1-min close above OR high; short below OR low. Trade only if range health ≈0.3×–3× typical; else skip the session for that instrument. Stop = opposite OR side; target = 2R; if neither hits by close, exit at market. Re-entry only after price pulls back inside the OR. 20-period MA (15-min) = trend read (logged, not blocking).
- **Sessions:** Asia 09:00–13:00 `Asia/Tokyo`, Gold only, OR 09:00–09:15, skip JP/AU holiday. NY 09:30–16:00 `America/New_York`, Gold/NQ/ES, OR 09:30–09:45, skip US holiday. Per session: holiday → staleness (>10 min skip) → OR → breakout hunt → close at end. Daily count + loss cap carry across both. UTC internally; render in market + user tz.
- **Instruments:** Gold (XAU/USD, both), NQ (NY), ES (NY). Yahoo `GC=F/NQ=F/ES=F`. Fallback ladder: Yahoo → broker API (live) → last-known-good cache (bridge only) → skip+alert. Phase 6+: per-account enabled-instruments list.
- **News:** ForexFactory weekly → `news_events` (UTC). High-impact USD: no new entries −15→+15 min. Top-tier (FOMC/NFP/CPI/Fed Funds): flatten open positions −5 min. Fail safe (fresh → cache <24h → conservative built-in schedule → flag). Signal in blackout → skip+log.
- **Evidence loop:** tracks instrument/session/range-bucket/entry-time/trend-agreement. Auto-tunes only 3 things within bounds — min range filter, max range filter, entry cutoff time. Gates: ≥20 trades in category, ≥5 days since last change, effect beyond noise, confidence excludes "no effect", bounded step. First **15** adjustments auto (logged + Discord); after that → Approval Queue. Cannot touch risk %, stop/target, caps, or core logic. Not ML — a bounded stats loop.

---

## 12. Feature Roadmap (phased)

- **Phase 1 — Real single-user paper product (MVP):** subdomains + custom Clerk auth; one real paper account + one ORB bot per user; engine persistence + Yahoo feed + scheduler + screenshots; redesigned, fully de-mocked Overview/Journal/Strategy/Analytics/Accounts/Settings; demo account; empty/loading/error everywhere; metrics unit-tested.
- **Phase 2 — Multi-bot hub + live trading + monetization:** multiple bots/accounts, clone-strategy, per-bot isolation; live execution (Alpaca → OANDA/IBKR/Tradovate) with encrypted `Connection` + test-connection + reconciliation; Clerk Billing + gating; Discord notifications.
- **Phase 3 — Differentiators:** no-code-plus (paste/"vibe-code" strategy → auto-extract typed params, bounds enforced); strategy templates/marketplace; backtesting; copy-trading (signal → copier, proportional sizing); funded accounts; public API; PWA/mobile polish.
- **Added beyond Notion:** live demo account as a marketing asset; unified `AgentEvent` stream on product + landing; security/trust page; insufficient-data states; plan-aware onboarding; CSV export; optional weekly performance email; status page.

---

## 13. Monetization

| Tier | Price | Includes |
| --- | --- | --- |
| Free | $0 | Paper, 1 account, 1 bot, full dashboard/journal/analytics |
| Trader | $29/mo | Live trading, 3 accounts/bots, Discord alerts, priority support |
| Pro | $79/mo | Unlimited accounts/bots, copy-trading, marketplace, backtesting, API |

**Clerk Billing** (`clerk-billing` skill): `PricingTable` on `/pricing` + in-app checkout on `/billing`; gate live-trading + account/bot counts with `has({plan|feature})` server-side; billing webhooks update entitlements. No fake billing UI.

---

## 14. Dependencies to Add

`@supabase/supabase-js` (Realtime + Storage), `d3-scale` + `d3-shape` (chart math; or hand-roll), `zod` (param schema), `vitest` (metrics tests). Encryption uses Node `crypto` (no dep). Engine (Python): `yfinance`, `psycopg`/SQLAlchemy, `matplotlib` or Playwright, `supabase` (storage), later `cryptography`. Remove `@clerk/ui` once prebuilt widgets are gone (keep only if `<UserButton/>` needs its theme).

---

## 15. Observability, CI & Performance

- **Next.js conventions:** `loading.tsx` (skeletons), `error.tsx` (inline recovery + reset), `not-found.tsx` per segment; a global error boundary.
- **Logging/observability:** structured engine logs (cycle, decisions, writes); optional Sentry on web + engine; surface stale-heartbeat / news-parser / reconciliation-mismatch warnings on the dashboard.
- **CI (GitHub Actions):** install → `prisma generate` → `tsc --noEmit` → `eslint` → `vitest` → `next build`; on main, `prisma migrate deploy` then Vercel deploy. Separate engine workflow (ruff + pytest). A SessionStart hook (`session-start-hook` skill) can ensure web sessions can run lint/tests.
- **Performance budget:** LCP <2.5s, INP <200ms, CLS <0.1. Lazy-load charts (`next/dynamic`), code-split dashboard, `next/font` (present), `priority` on any hero image, debounce realtime UI updates, animate only `transform`/`opacity`.

---

## 16. Critical Files & Where Work Lands

- **Routing/auth:** `src/proxy.ts` (host translate + protect; extend `productSubdomain()`); `src/lib/urls.ts` (new).
- **Shell/providers:** `src/app/layout.tsx` (drop prebuilt-widget appearance; add grain/aurora shell; keep metadata/fonts).
- **Tokens/visual world:** `src/app/globals.css` (add `--color-profit`, aurora/grain utilities).
- **Custom auth (new):** `src/components/auth/{auth-shell,sign-in-form,sign-up-form,forgot-password-form,otp-input,social-buttons}.tsx`; pages `(auth)/sign-in`, `(auth)/sign-up`, `(auth)/forgot-password`, `(auth)/sso-callback` (replace `[[...]]` widget pages); redesign `(auth)/layout.tsx`.
- **Dashboard (de-mock + redesign):** `src/app/dashboard/{page,journal,strategy,accounts,analytics,settings}/...` + new `bots`, `billing`, `profile`; move onboarding to `dashboard/onboarding`. Pattern (all): delete inline mock arrays + component-internal fakes, fetch via `lib/queries/*` in Server Components, pass real props, add empty/loading/error states, recolor P&L to `--color-profit`. Representative components: `src/components/dashboard/{equity-curve,metric-card,live-position,agent-feed,charts,journal-view,strategy-lab,accounts-view,settings-view,countdown,topbar,nav,emergency-stop}.tsx`.
- **UI primitives:** `src/components/ui/*` (upgrade + add per §6.3).
- **Marketing:** `src/components/marketing/*` + new `/pricing`, `/how-it-works`, `/security`, legal, `sitemap.ts`, `robots.ts`.
- **Server/data (new):** `src/lib/{metrics,realtime,crypto,strategy-schema,urls}.ts`, `src/lib/queries/*`, server actions; reuse `src/lib/db.ts` + `src/lib/utils.ts`. Delete `src/lib/mock-data.ts`.
- **Schema:** `prisma/schema.prisma` (+`Connection`,`AgentEvent`,`UserSettings`, indexes), migration, `prisma/seed.ts`.
- **Engine:** `/engine/floqex_engine/*` — persistence + Yahoo feed + scheduler/worker + screenshots + reconciliation; deploy; seed demo. Document enum parity in `/engine/README.md`.
- **Config:** `.env.example` (absolute Clerk URLs, `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optional Discord), `DEPLOYMENT.md` (3 domains/one Vercel project, cookie `.floqex.com`, Clerk prod instance + third-party-auth for Supabase + webhook, engine worker), optional `vercel.json`.
- **Reuse:** `globals.css` tokens/easing, `marketing/reveal`, the `equity-curve` SVG/`pathLength` pattern (rewire to real data), `ui/*`, the Clerk webhook handler, `lib/db.ts`, `lib/utils.ts` `cn`, `productSubdomain()`.

---

## 17. Build Sequence

1. **Foundations:** add `--color-profit` + aurora/grain in `globals.css`; build/upgrade UI primitives; add deps (§14).
2. **Subdomains + links:** rewrite `proxy.ts`; add `lib/urls.ts`; set absolute Clerk env; verify clean URLs locally (path-based) and prod mapping.
3. **Custom auth:** forms + OTP + reset + SSO callback + CAPTCHA + auth shell; confirm sign-up→onboarding and sign-in→dashboard across subdomains.
4. **Data layer:** Prisma models + migration + seed; `metrics/queries/realtime/crypto/strategy-schema`; server actions; Supabase RLS + Clerk third-party auth; **unit-test `metrics.ts`**.
5. **Engine:** persistence + Yahoo feed + scheduler + screenshots; deploy worker; seed demo account.
6. **Dashboard de-mock + redesign:** Overview → Journal → Strategy Lab → Analytics → Accounts → Bots → Settings/Billing/Profile; delete `mock-data.ts`.
7. **Marketing redesign:** home (real demo preview) + pricing/how-it-works/security/legal + SEO.
8. **Monetization:** Clerk Billing + gating.
9. **Polish:** motion (Emil), responsive (5 breakpoints), a11y/contrast/reduced-motion, anti-slop review; `npm run build` + `npm run lint` clean; CI green.

---

## 18. Verification (prove it's real and works)

- **Subdomains:** prod `accounts.floqex.com/sign-in` & `dashboard.floqex.com/journal` render natively (no cross-domain bounce); localhost path-based equivalents work. Walk §4.4.
- **Auth:** sign up via custom form (email OTP + a social provider), confirm webhook upserts the `users` row, sign out → `floqex.com`, sign back in → `dashboard.floqex.com` with the same session (cookie on `.floqex.com`); CAPTCHA element present.
- **Real data (key check):** grep `src/` for mock arrays / `mulberry32` / `mock-data` — **none remain**; every figure traces to a Prisma query or Realtime channel. Run the engine against the demo account; confirm new `trades`/`daily_summaries`/heartbeat/`agent_events` rows appear and Overview/Journal/Analytics update from them (Realtime + reload). A brand-new user sees **empty states**, not fake numbers.
- **Isolation:** with two test users, confirm RLS blocks cross-user Realtime/reads; Decimal values serialize correctly (no `[object Object]`/precision loss).
- **Metrics:** `vitest` unit tests for `metrics.ts` (winRate, profitFactor, maxDrawdown, expectancy, equitySeries) vs a known trade set.
- **Strategy Lab:** edit a param → confirm → new `Strategy.version` + Change-Log row; out-of-bounds rejected client- and server-side (zod); engine picks up new params next cycle.
- **Safety:** Emergency Stop → STOPPED honored by the engine; UI reflects real heartbeat; daily-loss breaker blocks new entries at the cap; benching after 4 losses.
- **Billing:** Clerk test-mode upgrade → `has()` unlocks live-trading/account limits.
- **Design/perf gates:** dark-locked; emerald-only accent; profit≠brand color; zero em-dashes; responsive 640/768/1024/1280/1536; reduced-motion collapses motion; AA contrast; Lighthouse LCP/INP/CLS within budget; "AI made this?" → no.

---

## 19. Open Decisions (non-blocking; sensible defaults assumed)

- Engine host: Railway/Render/Fly worker (assumed) vs VPS.
- Screenshot storage: Supabase Storage (assumed) vs Vercel Blob.
- Realtime auth: Clerk-as-Supabase-third-party-auth + RLS (assumed) vs server-proxied SSE.
- Broker priority for live phase: Alpaca first (assumed).
- Holiday calendar source for skip-on-holiday (exchange-calendar lib vs maintained list).
- Personal-first now; Clerk **Organizations** (team/B2B) layer later without reworking the single-user model.
