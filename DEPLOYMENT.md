# Floqex Deployment

One Next.js 16 app serves every domain. Routing is path-based locally and on
preview deploys; on production the `users.`, `accounts.`, and `dashboard.`
subdomains are mapped to their sections by `src/proxy.ts`.

## Domains

| Domain | Serves | How |
| --- | --- | --- |
| `floqex.com` | Marketing landing | Default app routes (`/`) |
| `app.floqex.com` | Unified Auth & Product | Root rewrites to `/sign-in` or `/dashboard` based on session; `/sign-up` works directly. |

On Vercel, add both domains to the same project (apex + `app.` subdomain). No separate projects are needed.

## Environment variables

Copy `.env.example` to `.env.local` for local dev, and set the same keys in the Vercel
project settings for production. See `.env.example` for the full list:

- **Clerk** publishable + secret keys, the four auth-routing URLs, and the webhook secret.
- **Database** `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432).
- **Supabase** project URL + publishable key (for future storage/realtime use).
- **Stripe** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the `NEXT_PUBLIC_STRIPE_PRICE_*` ids.
- **Security** `ENCRYPTION_KEY` (`openssl rand -base64 32`) for broker-credential encryption at rest.
- **Mochi** `OPENAI_API_KEY` for the in-app assistant.

## Clerk

1. Create a Clerk application.
2. Ensure you have standard session settings. (You DO NOT need `isSatellite` or a custom shared session cookie domain unless spanning different root domains).
3. Set the sign-in/up URLs to `https://app.floqex.com/sign-in` and `/sign-up`, and
   the after-auth URLs to `https://app.floqex.com/dashboard` and
   `https://app.floqex.com/onboarding`.
4. Add a webhook to `https://app.floqex.com/api/webhooks/clerk` for the
   `user.created`, `user.updated`, and `user.deleted` events, and put its signing secret
   in `CLERK_WEBHOOK_SIGNING_SECRET`. This keeps the `users` table in sync.

## Database (Supabase + Prisma)

The schema lives in `prisma/schema.prisma`. The initial migration is at
`prisma/migrations/0001_init/migration.sql` and has already been applied to the Floqex
Supabase project.

To apply against a fresh database:

```bash
# Set DATABASE_URL and DIRECT_URL first
npm run db:push        # or: npx prisma migrate deploy
npm run db:seed        # creates the "Floqex Demo" account for the preview
```

`prisma generate` runs automatically on `postinstall`.

## Stripe (billing)

Add a webhook to `https://app.floqex.com/api/webhooks/stripe` subscribed to
`checkout.session.completed` and `customer.subscription.created/updated/deleted`, and
put its signing secret in `STRIPE_WEBHOOK_SECRET`. The Trader and Pro products/prices
exist in test mode; create live-mode prices and update `NEXT_PUBLIC_STRIPE_PRICE_*`
before charging real cards.

## Build

```bash
npm install   # runs prisma generate
npm run build
npm run start
```

## Trading engine (cron)

The engine runs as a Next route at `/api/cron/engine`. It is protected by `CRON_SECRET`
(Vercel attaches `Authorization: Bearer $CRON_SECRET` automatically) and also accepts an
external `?secret=$API_SECRET` (or `x-api-secret` header). Set `CRON_SECRET` in the
project env or the route returns 401 and the engine never ticks.

`vercel.json` ships a once-daily cron so the deploy is valid on **every** Vercel tier:

```json
{ "crons": [{ "path": "/api/cron/engine", "schedule": "0 13 * * *" }] }
```

A trading engine needs to tick far more often than once a day, but **Vercel Hobby only
permits daily crons** (a sub-daily schedule like `*/1 * * * *` makes the deploy fail).
To run the engine at a useful cadence, pick one:

1. **Vercel Pro** — change the schedule to `*/1 * * * *` (or `*/5`) and redeploy.
2. **External scheduler** (works on Hobby) — point cron-job.org / GitHub Actions / Upstash
   at `https://<app>/api/cron/engine?secret=$API_SECRET` every 1–5 minutes.
3. **Bundled worker** — run the long-running Node worker (`npm run worker`, see
   `ecosystem.config.js` / `docker-compose.yml`); it ticks every 2s and mirrors the route.

All paths write the same shapes the app reads (trades, daily summaries, bot heartbeat,
agent-feed events). The standalone Python worker in `engine/` remains available for local
experimentation.

## CI

`.github/workflows/ci.yml` runs typecheck, lint, and the vitest metrics tests on every
PR. `next build` is left to Vercel, which holds the runtime secrets a server build needs.

## Live realtime (still to configure)

Live dashboard surfaces currently refresh via revalidation. For push updates, wire
Supabase Realtime with Row-Level Security keyed on the Clerk JWT (Clerk as a Supabase
third-party auth provider) so a client can only subscribe to its own rows. Until then,
every read goes through server queries scoped to the signed-in user, so no table is
client-readable without an ownership check.
