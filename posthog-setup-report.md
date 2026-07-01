<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Floqex. Client-side tracking is initialized via `instrumentation-client.ts` (Next.js 15.3+ pattern — no provider required) with a reverse proxy through `/ingest` to avoid ad-blockers. Twelve events are captured across the full user lifecycle: sign-up, sign-in, onboarding, AI strategy usage, emergency stop, settings, data export, referral, and server-side marketplace purchases. User identity is established via `posthog.identify()` on every auth completion path (email, MFA TOTP, MFA backup code, email code) and synced server-side from the Clerk `user.created` webhook.

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | User completes email verification and creates an account. | `src/components/auth/sign-up-form.tsx` |
| `user_signed_in` | User successfully signs in with email/password or OAuth. | `src/components/auth/sign-in-form.tsx` |
| `onboarding_completed` | User finishes the full onboarding flow and activates their bot. | `src/app/onboarding/onboarding-flow.tsx` |
| `onboarding_plan_selected` | User selects a paid plan and proceeds to Stripe checkout during onboarding. | `src/app/onboarding/onboarding-flow.tsx` |
| `strategy_generated` | User successfully generates a trading strategy AST via the AI strategy builder. | `src/components/dashboard/ai-strategy-builder.tsx` |
| `strategy_deployed` | User deploys a generated AI trading strategy to their account. | `src/components/dashboard/ai-strategy-builder.tsx` |
| `emergency_stop_triggered` | User triggers the emergency stop to halt all active trading immediately. | `src/components/dashboard/emergency-stop.tsx` |
| `settings_saved` | User saves notification preferences or risk settings in the settings panel. | `src/components/dashboard/settings-view.tsx` |
| `trades_exported` | User downloads their full trade history as a CSV file. | `src/components/dashboard/settings-view.tsx` |
| `referral_link_generated` | User generates a referral link in the affiliate panel. | `src/components/dashboard/settings-view.tsx` |
| `marketplace_purchase_completed` | A marketplace strategy purchase is confirmed via Stripe webhook. | `src/app/api/webhooks/stripe/route.ts` |
| `user_created` | A new user account is created and synced from Clerk webhook. | `src/app/api/webhooks/clerk/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/493301/dashboard/1784916)
- [New signups over time](https://us.posthog.com/project/493301/insights/8q4GH9Jm)
- [Signup to onboarding conversion funnel](https://us.posthog.com/project/493301/insights/GIu8BSbC)
- [AI strategy activity](https://us.posthog.com/project/493301/insights/ude6ad7x)
- [Emergency stops triggered](https://us.posthog.com/project/493301/insights/94n4G179)
- [Marketplace purchases completed](https://us.posthog.com/project/493301/insights/Lbn7s6Cg)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`npm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog Error Tracking.
- [ ] Confirm the returning-visitor path also calls `identify` — currently `identify` is called on every auth completion, but OAuth sign-ins (handled by Clerk's SSO flow) bypass the form submit handlers. Consider adding an `identify` call in a client layout that reads the Clerk session on mount for those users.

---

## LLM analytics (Vercel AI SDK / Google Gemini)

PostHog AI Observability has been wired to all three Gemini call sites using the OpenTelemetry span processor. Every `$ai_generation` event is captured automatically with model name, input/output token counts, latency, and cost. Events are linked to the authenticated PostHog user via `posthog_distinct_id`.

### New files

| File | Purpose |
|------|---------|
| `instrumentation.ts` | Server-side OTel SDK bootstrap — registers `PostHogSpanProcessor` on the Node.js runtime so all Vercel AI SDK calls emit `gen_ai.*` spans to PostHog automatically |

### Instrumented call sites

| File | Function ID | Model |
|------|-------------|-------|
| `src/app/api/chat/route.ts` | `mochi-chat` | `gemini-2.5-flash` (Mochi copilot streaming) |
| `src/app/dashboard/strategy/actions.ts` | `mochi-ai-analysis` | `gemini-2.5-flash` (AI strategy parameter optimiser) |
| `src/app/api/ai/compile-strategy/route.ts` | `compile-strategy` | `gemini-1.5-pro` (natural-language → strategy AST) |

Each call sets `experimental_telemetry: { isEnabled: true, functionId: "...", metadata: { posthog_distinct_id: userEmail } }`.

### New packages installed

- `@posthog/ai` — `PostHogSpanProcessor` for OTel export
- `@opentelemetry/sdk-node` — Node.js OTel SDK
- `@opentelemetry/resources` — `resourceFromAttributes` helper

### Verify LLM analytics

- [ ] Trigger one of the three LLM call paths (e.g. send a Mochi chat message) and confirm `$ai_generation` events appear in [PostHog AI Observability](https://us.posthog.com/ai-observability/generations).

### Agent skill

We've left agent skill folders in your project at `.claude/skills/integration-nextjs-app-router/` and `.claude/skills/llm-analytics-setup/`. You can use this context for further agent development when using Claude Code.

</wizard-report>
