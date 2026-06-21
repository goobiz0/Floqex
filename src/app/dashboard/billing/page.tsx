import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillingData } from "@/lib/queries";
import { PLANS, formatAccountLimit } from "@/lib/plans";
import { BillingPlans } from "@/components/dashboard/billing-plans";
import { DashboardError } from "@/components/dashboard/states";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const data = await getBillingData();
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

          <BillingPlans currentPlan={data.plan} hasCustomer={data.hasCustomer} />
        </>
      )}
    </div>
  );
}
