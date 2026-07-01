# PostHog Data Warehouse Setup Report

## Sources Created

### PostgreSQL (Supabase) — Connected

**Source ID:** `019f1dac-f3bd-0000-1097-ff2357803f13`
**Host:** `aws-1-ap-northeast-1.pooler.supabase.com` (Session pooler, port 6543)
**Access method:** `warehouse` (import + live-queryable)

The following 10 tables were added and are now syncing:

| Table | Sync Method | Incremental Field |
|---|---|---|
| `users` | Incremental | `updatedAt` |
| `accounts` | Incremental | `updatedAt` |
| `trades` | Full refresh | — |
| `bots` | Incremental | `updatedAt` |
| `strategies` | Incremental | `updatedAt` |
| `daily_summaries` | Incremental | `createdAt` |
| `marketplace_listings` | Incremental | `updatedAt` |
| `marketplace_purchases` | Full refresh | — |
| `marketplace_reviews` | Incremental | `updatedAt` |
| `copy_links` | Incremental | `updatedAt` |

`trades` and `marketplace_purchases` use full refresh because their rows are mutated after creation (trades close, purchases complete) and neither has an `updatedAt` column.

12 additional tables were discovered but not enabled: `_prisma_migrations`, `agent_events`, `bot_adjustments`, `connections`, `copy_trade_events`, `dashboard_templates`, `forward_tests`, `mochi_usage`, `news_events`, `notifications`, `user_roles`, `withdrawal_requests`. These can be enabled later from the PostHog sources tab.

---

## Sources Needing Browser Setup

Credentials were not provided for these sources during the wizard run. Complete setup by opening each URL below in your browser.

### Stripe

> [Connect Stripe in PostHog](https://us.posthog.com/project/493301/data-warehouse/new-source?kind=Stripe)

**Recommended:** Use a restricted API key (`rk_live_...`) with Read on Core/Billing/Connect and **Write on Webhooks** so PostHog can set up real-time webhook syncing automatically. Do not use your `sk_live_...` secret key.

### Clerk

> [Connect Clerk in PostHog](https://us.posthog.com/project/493301/data-warehouse/new-source?kind=Clerk)

Your `CLERK_SECRET_KEY` env var is set. You will need to paste the value (starts with `sk_live_...`) into the PostHog form.

### Notion

> [Connect Notion in PostHog](https://us.posthog.com/project/493301/data-warehouse/new-source?kind=Notion)

Create an internal integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and copy the token (starts with `ntn_` or `secret_`). Then share each Notion database or page you want synced with the integration via its ••• menu → Connections — otherwise PostHog will not see it.

---

## Files Modified or Created

| File | Change |
|---|---|
| `posthog-warehouse-report.md` | Created (this file) |

No application source files were modified.

---

## Manual Steps

1. **Enable PostHog's egress IPs on Supabase** — Add the following IPs to your Supabase project's network allowlist (if not already open): `44.205.89.55`, `52.4.194.122`, `44.208.188.173`.
2. **Connect Stripe** — Open the link above, paste a restricted API key with Webhook write access, and enable webhook sync after creation.
3. **Connect Clerk** — Open the link above, paste your `CLERK_SECRET_KEY` value.
4. **Connect Notion** — Create an internal integration, share relevant pages with it, then open the link above and paste the token.
5. **Monitor Postgres sync** — Visit [PostHog Sources](https://us.posthog.com/project/493301/data-management/sources) to confirm tables are syncing. The first sync may take several minutes depending on table size.
6. **Enable additional Postgres tables** — If you want `agent_events`, `bot_adjustments`, `copy_trade_events`, etc., enable them from the source's Schemas tab in PostHog.
