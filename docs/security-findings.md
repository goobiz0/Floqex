# Security findings — RLS & CSP review

Generated during the site-improvement pass. These are **advisory**: the SQL
below is presented for review, not auto-applied. Enabling RLS without policies
blocks all PostgREST access to a table, so each item needs a human decision.

## Context

Floqex authenticates with **Clerk** and reads/writes its database with **Prisma**
over a direct Postgres connection (service-level), not through Supabase's
PostgREST anon API. Row Level Security is the safety net for the anon/authenticated
roles that the Supabase client libraries expose. Good news: **RLS is already
enabled on every application table** (`users`, `accounts`, `bots`, `strategies`,
`trades`, `daily_summaries`, `agent_events`, `mochi_usage`, `forward_tests`, etc.).
The items below are the residual gaps reported by the Supabase security advisor
(`get_advisors`, project `fisqjoalatwvddzityww`).

## 1. ERROR — `_prisma_migrations` is exposed (RLS disabled)

`public._prisma_migrations` has RLS disabled, so anyone with the public anon key
can read (and potentially modify) the migration history via PostgREST. The data
is low-sensitivity (migration names + checksums) but it should not be world-readable.

Review and apply:

```sql
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
-- No policy is added, which means: no PostgREST access at all. The Prisma
-- direct connection (service role / db owner) bypasses RLS and keeps working.
```

## 2. WARN — `SECURITY DEFINER` functions callable by anon/authenticated

These functions are executable by the `anon` and `authenticated` roles via
`/rest/v1/rpc/...`, which lets unauthenticated callers invoke privileged logic:

- `public.current_app_user_id()`
- `public.handle_new_auth_user()`
- `public.has_role(_user_id uuid, _role public.app_role)`

They appear to belong to a Supabase-Auth-based RBAC scaffold (`user_roles`,
`app_role`) that is largely vestigial now that Clerk is the auth system. If they
are not meant to be public, revoke execution:

```sql
REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
```

If the Supabase-Auth RBAC scaffold is truly unused, consider dropping
`handle_new_auth_user`, `has_role`, `user_roles`, and the `app_role` type in a
dedicated migration after confirming nothing references them.

## 3. INFO — `forward_tests` and `mochi_usage`: RLS on, no policies

These have RLS enabled with no policies, so PostgREST denies all access. Because
the app reaches them through Prisma (direct connection) this is **safe as-is** —
it simply means they are not exposed through the public API. No action needed
unless a future feature needs anon/authenticated access to them.

## 4. CSP — `script-src 'unsafe-eval'` (recommendation, not changed here)

`next.config.ts` sets `script-src ... 'unsafe-eval' 'unsafe-inline'`. Removing
`'unsafe-eval'` would tighten the policy, but it is commonly required by Next dev
HMR and can be needed by Remotion's player. This should be changed only with a
browser in the loop: load Clerk sign-in, Stripe checkout, and a Remotion-embedded
marketing section with the console open and watch for CSP violations before
shipping. Left unchanged in this pass to avoid an unverifiable regression.

Verify any change with: `get_advisors(type: "security")` after applying, and a
manual smoke of the auth + checkout + embed flows.
