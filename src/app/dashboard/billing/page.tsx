import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillingData, getMonthlyUsage } from "@/lib/queries";
import { PLANS, formatAccountLimit } from "@/lib/plans";
import { BillingPlans } from "@/components/dashboard/billing-plans";
import { reconcileSubscription } from "@/app/dashboard/billing/actions";
import { DashboardError } from "@/components/dashboard/states";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage(props: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await props.searchParams;

  // Returning from Stripe Checkout: pull the live subscription and flip the
  // plan now, rather than waiting on the webhook (which may be delayed or, in
  // some environments, not configured at all).
  if (status === "success") {
    await reconcileSubscription();
  }

  const [data, monthlyUsage] = await Promise.all([getBillingData(), getMonthlyUsage()]);
  const current = PLANS[data.plan];
  const activeStatus = data.status === "active" || data.status === "trialing";
  const renews = data.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Billing</h1>
        <p className="text-sm text-fg-subtle">Your plan, usage, and payment details.</p>
      </div>

      {status === "success" && !data.error && (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-profit/30 bg-profit/10 px-4 py-3 text-sm text-profit">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span className="font-medium text-fg">Payment confirmed. Your plan is now {current.name}.</span>
        </div>
      )}
      {status === "cancelled" && (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 text-sm text-fg-muted">
          Checkout was cancelled. Your plan has not changed.
        </div>
      )}

      {data.error ? (
        <DashboardError title="Billing data unavailable" message="We couldn't load your subscription details from Stripe. Please try refreshing." />
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Current plan</CardTitle>
                  {data.status && (
                    <Badge tone={activeStatus ? "positive" : "warning"}>{data.status}</Badge>
                  )}
                </div>
                <p className="mt-2 text-2xl font-semibold text-fg">
                  {current.name}
                  {current.price > 0 && (
                    <span className="text-sm font-normal text-fg-subtle"> · ${current.price}/mo</span>
                  )}
                </p>
                {renews && <p className="mt-1 text-xs text-fg-subtle">Renews {renews}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-fg-subtle">Accounts</p>
                <p className="tnum text-lg font-semibold text-fg">
                  {data.accountCount} / {formatAccountLimit(current.accountLimit)}
                </p>
              </div>
            </div>
          </Card>

          <BillingPlans currentPlan={data.plan} hasCustomer={data.hasCustomer} monthlyUsage={monthlyUsage} />
        </>
      )}
    </div>
  );
}
