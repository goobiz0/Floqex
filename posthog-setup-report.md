<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Floqex across two runs. Client-side tracking is initialized via `instrumentation-client.ts` (Next.js 15.3+ pattern — no provider required) with a reverse proxy through `/ingest` to avoid ad-blockers. Twenty-three events are captured across the full user lifecycle: sign-up, sign-in, onboarding, bot lifecycle, broker account connection, AI strategy usage, marketplace (buyer and seller flows), copy-trading, emergency stop, settings, data export, referral, and server-side Stripe/Clerk events. User identity is established via `posthog.identify()` on every auth completion path and synced server-side from the Clerk webhook.

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | User completes email verification and creates an account. | `src/components/auth/sign-up-form.tsx` |
| `user_signed_in` | User successfully signs in with email/password or MFA. | `src/components/auth/sign-in-form.tsx` |
| `onboarding_completed` | User finishes the full onboarding flow. | `src/app/onboarding/onboarding-flow.tsx` |
| `onboarding_plan_selected` | User selects a paid plan and proceeds to Stripe checkout during onboarding. | `src/app/onboarding/onboarding-flow.tsx` |
| `strategy_generated` | User generates a trading strategy via the AI builder. | `src/components/dashboard/ai-strategy-builder.tsx` |
| `strategy_deployed` | User deploys a generated AI trading strategy. | `src/components/dashboard/ai-strategy-builder.tsx` |
| `emergency_stop_triggered` | User triggers the emergency stop to halt all active trading. | `src/components/dashboard/emergency-stop.tsx` |
| `settings_saved` | User saves preferences or risk settings. | `src/components/dashboard/settings-view.tsx` |
| `trades_exported` | User downloads their trade history as CSV. | `src/components/dashboard/settings-view.tsx` |
| `referral_link_generated` | User generates a referral link. | `src/components/dashboard/settings-view.tsx` |
| `marketplace_purchase_completed` | A marketplace strategy purchase is confirmed via Stripe webhook. | `src/app/api/webhooks/stripe/route.ts` |
| `user_created` | A new user account is synced from the Clerk webhook. | `src/app/api/webhooks/clerk/route.ts` |
| `bot_created` | A user successfully creates a new trading bot. | `src/app/dashboard/bots/actions.ts` |
| `bot_deleted` | A user permanently deletes a trading bot. | `src/app/dashboard/bots/actions.ts` |
| `forward_test_started` | A user starts a forward test on a paper trading bot. | `src/app/dashboard/bots/actions.ts` |
| `account_connected` | A user successfully connects a broker account. | `src/app/dashboard/accounts/actions.ts` |
| `marketplace_listing_created` | A seller creates a new strategy listing. | `src/app/dashboard/marketplace/actions.ts` |
| `marketplace_listing_status_changed` | A seller changes their listing status (DRAFT/ACTIVE/PAUSED). | `src/app/dashboard/marketplace/actions.ts` |
| `withdrawal_requested` | A seller submits a withdrawal request. | `src/app/dashboard/marketplace/actions.ts` |
| `marketplace_checkout_initiated` | A buyer initiates a Stripe checkout for a marketplace strategy. | `src/app/api/checkout/marketplace/route.ts` |
| `copy_link_created` | A user creates a copy-trading link between accounts. | `src/app/dashboard/copy-trading/actions.ts` |
| `copy_link_toggled` | A user toggles a copy-trading link active/paused. | `src/app/dashboard/copy-trading/actions.ts` |
| `pricing_page_viewed` | A visitor views the pricing page (top of subscription funnel). | `src/app/(marketing)/pricing/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/493301/dashboard/1785048)
- [New user signups](https://us.posthog.com/project/493301/insights/fXS3CUwl)
- [Bots created vs deleted](https://us.posthog.com/project/493301/insights/YNPYQerp)
- [Marketplace purchase funnel](https://us.posthog.com/project/493301/insights/HIzLASoB)
- [Feature adoption: accounts, copy trading, forward tests](https://us.posthog.com/project/493301/insights/RimkV7BQ)
- [Seller marketplace activity](https://us.posthog.com/project/493301/insights/LXReRnk6)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`npm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog Error Tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is called on every auth completion, but OAuth sign-ins bypass the form submit handlers. Consider adding an `identify` call in a client layout that reads the Clerk session on mount for those users.
- [ ] Trigger one of the three LLM call paths (e.g. send a Mochi chat message or compile a strategy) and confirm `$ai_generation` events appear in [PostHog AI Observability](https://us.posthog.com/ai-observability/generations).

---

## LLM analytics (Vercel AI SDK / Google Gemini)

PostHog AI Observability is wired to all three Gemini call sites via the OpenTelemetry span processor. Every `$ai_generation` event is captured automatically with model name, input/output token counts, latency, and cost. Events are correlated to authenticated PostHog users via `posthog_distinct_id` (the user's email address, matching the client-side `identify()` calls).

### How it works

`instrumentation.ts` (Next.js server instrumentation hook) bootstraps the Node.js OTel SDK on startup with `PostHogSpanProcessor` from `@posthog/ai/otel`. The Vercel AI SDK emits `gen_ai.*` OTel spans for every LLM call; the processor forwards them to PostHog, which converts them into `$ai_generation` events automatically.

**Packages:** `@posthog/ai ^8.2.2`, `@opentelemetry/sdk-node ^0.219.0`, `@opentelemetry/resources ^2.8.0`

### Instrumented call sites

| File | Function ID | Model | Distinct ID source |
|------|-------------|-------|--------------------|
| `src/app/api/chat/route.ts` | `mochi-chat` | `gemini-2.5-flash` | `user.email ?? clerkUserId` |
| `src/app/dashboard/strategy/actions.ts` | `mochi-ai-analysis` | `gemini-2.5-flash` | `user.email ?? clerkUserId` |
| `src/app/api/ai/compile-strategy/route.ts` | `compile-strategy` | `gemini-1.5-pro` | `dbUser?.email ?? clerkUserId` |

### Agent skill

We've left agent skill folders in your project at `.claude/skills/integration-nextjs-app-router/` and `.claude/skills/llm-analytics-setup/`. You can use this context for further agent development when using Claude Code.

</wizard-report>
