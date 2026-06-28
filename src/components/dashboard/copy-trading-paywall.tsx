import {
  LockSimple,
  Lightning,
  ArrowsLeftRight,
  ShieldCheck,
  UsersThree,
  Gauge,
  Copy,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/plans";

const BENEFITS = [
  {
    icon: ArrowsLeftRight,
    title: "Cross-broker replication",
    body: "Lead from one account and mirror its trades onto followers on any broker, paper or live.",
  },
  {
    icon: Gauge,
    title: "Smart sizing per link",
    body: "Proportional by equity, fixed multiplier, mirror, or fixed size. Cap risk on every copy.",
  },
  {
    icon: UsersThree,
    title: "Multi-account routing",
    body: "Fan one master out to as many follower accounts as your plan allows, hub and spoke.",
  },
  {
    icon: ShieldCheck,
    title: "Full control and audit",
    body: "Pause, reverse, or close-only any link, and review every replicated order in the activity log.",
  },
];

/**
 * Hard paywall for the Copy Trading surface. Rendered server-side whenever the
 * user's plan does not include copy trading, so no controls or real data ever
 * reach an unentitled session. The concept map uses generic role labels only,
 * never fabricated account numbers.
 */
export function CopyTradingPaywall({ plan }: { plan: Plan }) {
  // The cheapest plan that unlocks copy trading, for an accurate CTA.
  const unlockPlan = PLAN_ORDER.find((p) => PLANS[p].copyTrading);
  const unlockCfg = unlockPlan ? PLANS[unlockPlan] : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-fg">Copy Trading</h1>
          <Badge tone="accent">
            <Lightning size={12} weight="fill" /> Pro feature
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-fg-subtle">
          Execute the same trades across all of your accounts automatically, no matter the broker.
        </p>
      </div>

      <Card className="relative overflow-hidden p-0">
        {/* Locked concept map */}
        <div className="relative">
          <ConceptMap />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-base/40 to-base/90" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-md)]">
              <LockSimple size={22} weight="duotone" className="text-accent" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-fg">Unlock copy trading</h2>
            <p className="mt-1 max-w-md text-sm text-fg-subtle">
              {unlockCfg
                ? `Available on ${PLAN_ORDER.filter((p) => PLANS[p].copyTrading).map((p) => PLANS[p].name).join(" and ")}. Upgrade to link your accounts and mirror every trade.`
                : "Upgrade your plan to link your accounts and mirror every trade."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button href="/dashboard/billing">
                <Lightning weight="fill" />
                {unlockCfg ? `Upgrade to ${unlockCfg.name}` : "Upgrade plan"}
              </Button>
              <Button href="/pricing" variant="secondary">
                Compare plans
                <ArrowRight weight="bold" />
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-fg-faint">
              You are on the {PLANS[plan].name} plan.
            </p>
          </div>
        </div>
      </Card>

      {/* Benefits */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.title} className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-elevated p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                <Icon size={18} weight="duotone" />
              </span>
              <div>
                <p className="text-sm font-medium text-fg">{b.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-fg-subtle">{b.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface/40 px-4 py-3">
        <ShieldCheck size={18} weight="duotone" className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-fg-subtle">
          Copy trading replicates orders across accounts, so it multiplies both gains and losses. Past performance does
          not guarantee future results. You stay responsible for every linked account.
        </p>
      </div>
    </div>
  );
}

/** Static, generic master-to-follower illustration. No real data, role labels only. */
function ConceptMap() {
  return (
    <div className="relative h-[260px] w-full overflow-hidden bg-base">
      <div aria-hidden className="grid-faint absolute inset-0 opacity-40" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <path d="M 210 130 C 290 130, 300 56, 390 56" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
        <path d="M 210 130 C 300 130, 300 130, 390 130" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
        <path d="M 210 130 C 290 130, 300 204, 390 204" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
      </svg>

      <ConceptNode role="master" label="Master account" x={40} y={104} />
      <ConceptNode role="follower" label="Follower" x={392} y={30} />
      <ConceptNode role="follower" label="Follower" x={392} y={104} />
      <ConceptNode role="follower" label="Follower" x={392} y={178} />
    </div>
  );
}

function ConceptNode({ role, label, x, y }: { role: "master" | "follower"; label: string; x: number; y: number }) {
  const isMaster = role === "master";
  return (
    <div
      className="absolute flex h-[52px] w-[170px] flex-col justify-center rounded-[var(--radius-card)] border bg-elevated px-3 shadow-[var(--shadow-sm)]"
      style={{ left: `${(x / 600) * 100}%`, top: y, borderColor: isMaster ? "color-mix(in srgb, var(--color-accent) 40%, transparent)" : "var(--color-line)" }}
    >
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
          isMaster ? "bg-accent-soft text-accent" : "bg-surface text-fg-muted"
        }`}
      >
        {isMaster ? <Lightning size={9} weight="fill" /> : <Copy size={9} weight="fill" />}
        {isMaster ? "Master" : "Follower"}
      </span>
      <span className="mt-0.5 truncate text-[12px] font-medium text-fg">{label}</span>
    </div>
  );
}
