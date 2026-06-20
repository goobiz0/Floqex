# Floqex Deployment

One Next.js 16 app serves all three domains. Routing is path-based locally and on
preview deploys; on production the `dashboard.` and `accounts.` subdomains are mapped
to their sections by `src/proxy.ts`.

## Domains

| Domain | Serves | How |
| --- | --- | --- |
| `floqex.com` | Marketing landing | Default app routes (`/`) |
| `accounts.floqex.com` | Auth | Root rewrites to `/sign-in`; `/sign-up` works directly |
| `dashboard.floqex.com` | Product | Root rewrites to `/dashboard`; protected by Clerk |

On Vercel, add all three domains to the same project (apex + two subdomains, all
pointing at this deployment). No separate projects are needed.

## Environment variables

Copy `.env.example` to `.env.local` for local dev, and set the same keys in the Vercel
project settings for production. See `.env.example` for the full list:

- **Clerk** publishable + secret keys, the four auth-routing URLs, and the webhook secret.
- **Database** `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432).
- **Supabase** project URL + publishable key (for future storage/realtime use).

## Clerk

1. Create a Clerk application.
2. Set the **session cookie domain** to `.floqex.com` so the session is shared across
   `floqex.com`, `accounts.floqex.com`, and `dashboard.floqex.com`.
3. Set the sign-in/up URLs to `https://accounts.floqex.com/sign-in` and `/sign-up`, and
   the after-auth URLs to `https://dashboard.floqex.com` (sign-in) and
   `https://dashboard.floqex.com/onboarding` (sign-up). For path-based dev these are the
   `NEXT_PUBLIC_CLERK_*` values in `.env`.
4. Add a webhook to `https://dashboard.floqex.com/api/webhooks/clerk` for the
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
```

`prisma generate` runs automatically on `postinstall`.

## Build

```bash
npm install   # runs prisma generate
npm run build
npm run start
```

## Bot engine

The Python engine in `engine/` runs separately (a worker, not part of the web deploy).
See `engine/README.md`. It writes the same shapes the app reads (trades, summaries).
