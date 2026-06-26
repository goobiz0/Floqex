"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Robot, CaretLeft, Wallet, Sliders, TrendUp, TrendDown, ShieldCheck, Plus, X, Star } from "@phosphor-icons/react/dist/ssr";
import { createBot } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { SymbolSearchInput } from "@/components/dashboard/symbol-search-input";
import Link from "next/link";
import { cn, formatUSD } from "@/lib/utils";
import { DEFAULT_PARAMS, PARAM_BOUNDS, type Bound, type NumericParam } from "@/lib/strategy-schema";

type AccountProp = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: number;
};

// Premium parameters (live only on paid plans). Marked in the UI so users know
// what they get for upgrading.
const PREMIUM_PARAMS = new Set<string>(["minRange", "maxRange", "maxTrades", "trendFilter", "reEntry"]);

const QUICK_SYMBOLS = ["NQ", "ES", "AAPL", "NVDA", "BTC", "BHP.AX"];

// Indicators the custom engine understands (must match MarketData keys).
const INDICATORS = [
  { key: "price", label: "Price" },
  { key: "sma50", label: "50-day average" },
  { key: "dayHigh", label: "Day high" },
  { key: "dayLow", label: "Day low" },
];
const OPERATORS = [
  { key: ">", label: "is above" },
  { key: "<", label: "is below" },
  { key: ">=", label: "is at or above" },
  { key: "<=", label: "is at or below" },
];

type Condition = { indicator: string; operator: string; value: number | string };

export function BotsNewClient({ availableAccounts }: { availableAccounts: AccountProp[] }) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(availableAccounts[0]?.id ?? "");
  const [strategyKind, setStrategyKind] = useState<"ORB" | "CUSTOM">("ORB");
  const [instrument, setInstrument] = useState<string>("NQ");
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);

  // Custom strategy state
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [conditions, setConditions] = useState<Condition[]>([{ indicator: "price", operator: ">", value: "sma50" }]);
  const [stopLossPct, setStopLossPct] = useState(0.5);
  const [targetRatio, setTargetRatio] = useState(2);

  function handleNumParam(key: NumericParam, value: number) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function handleBoolParam(key: "trendFilter" | "reEntry" | "newsPause", value: boolean) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setConditions((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error("Please select an account.");
      return;
    }
    const inst = instrument.trim().toUpperCase() || "NQ";

    if (strategyKind === "CUSTOM" && conditions.length === 0) {
      toast.error("Add at least one entry condition for a custom strategy.");
      return;
    }

    const finalParams = {
      ...params,
      instrument: inst,
      ...(strategyKind === "CUSTOM"
        ? { direction, conditions, stopLossPct, targetRatio }
        : {}),
    };

    setLoading(true);
    const res = await createBot({
      accountId: selectedAccountId,
      strategyName: strategyKind === "ORB" ? `Opening Range Breakout · ${inst}` : `Custom Alpha · ${inst}`,
      strategyKind,
      params: finalParams,
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Bot created. Start it from the Bots page when you are ready.");
      router.push("/dashboard/bots");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to create bot.");
    }
  }

  if (availableAccounts.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-12 text-center max-w-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-pill)] bg-surface mb-6 border border-line">
          <Wallet size={32} className="text-fg-subtle" weight="duotone" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-fg mb-2">No available accounts</h2>
        <p className="text-fg-subtle mb-8">
          All your connected accounts already have a bot attached, or you haven&apos;t connected any accounts yet.
        </p>
        <Link href="/dashboard/accounts/new" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 text-sm font-medium text-[var(--color-on-accent)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
          Connect a Broker
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl pb-28">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors mb-6">
        <CaretLeft size={16} /> Back to dashboard
      </Link>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Account Selection */}
        <Section step={1} title="Target account">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableAccounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAccountId(a.id)}
                className={cn(
                  "flex items-start justify-between rounded-[var(--radius-control)] border p-4 text-left transition-colors",
                  selectedAccountId === a.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted",
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-fg">{a.nickname}</p>
                  <p className="text-xs text-fg-subtle mt-1">{a.broker} · {a.mode === "LIVE" ? "Live" : "Paper"}</p>
                </div>
                <p className="text-sm font-medium text-fg tnum">{formatUSD(a.balance)}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Step 2: Instrument */}
        <Section step={2} title="What should this bot trade?">
          <SymbolSearchInput value={instrument} onSelect={(s) => setInstrument(s)} />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_SYMBOLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInstrument(s)}
                className={cn(
                  "rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium transition-colors",
                  instrument === s ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-fg-subtle hover:text-fg hover:bg-surface-hover",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        {/* Step 3: Strategy Type */}
        <Section step={3} title="Strategy type">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StrategyCard
              active={strategyKind === "ORB"}
              onClick={() => setStrategyKind("ORB")}
              icon={<TrendUp size={20} weight="bold" />}
              title="Opening Range Breakout"
              desc="Captures momentum as price breaks the edge of the day's range. A proven, rules-based starting point."
            />
            <StrategyCard
              active={strategyKind === "CUSTOM"}
              onClick={() => setStrategyKind("CUSTOM")}
              icon={<Sliders size={20} weight="bold" />}
              title="Custom signal"
              desc="Build your own entry rules from live indicators. The engine supplies data and manages risk to your limits."
            />
          </div>
        </Section>

        {/* Step 4: Logic */}
        <Section step={4} title={strategyKind === "ORB" ? "Execution logic" : "Custom entry rules"}>
          {strategyKind === "ORB" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(["rangeMinutes", "minRange", "maxRange", "minVolume"] as NumericParam[]).map((key) => (
                  <SliderField
                    key={key}
                    bound={PARAM_BOUNDS[key]}
                    value={params[key]}
                    onChange={(v) => handleNumParam(key, v)}
                    premium={PREMIUM_PARAMS.has(key)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-line">
                <CheckField label="Trend filter" premium checked={params.trendFilter} onChange={(v) => handleBoolParam("trendFilter", v)} />
                <CheckField label="Allow re-entries" premium checked={params.reEntry} onChange={(v) => handleBoolParam("reEntry", v)} />
                <CheckField label="Pause on high-impact news" checked={params.newsPause} onChange={(v) => handleBoolParam("newsPause", v)} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Direction */}
              <div>
                <p className="mb-2 text-xs font-medium text-fg">Trade direction</p>
                <div className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-surface p-1">
                  {(["LONG", "SHORT"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirection(d)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-semibold transition-colors",
                        direction === d ? "bg-base text-fg shadow-[var(--shadow-sm)]" : "text-fg-subtle hover:text-fg",
                      )}
                    >
                      {d === "LONG" ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />}
                      {d === "LONG" ? "Go long" : "Go short"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditions */}
              <div>
                <p className="mb-2 text-xs font-medium text-fg">Enter when all of these are true</p>
                <div className="space-y-3">
                  {conditions.map((c, i) => {
                    const compareKey = typeof c.value === "string" ? c.value : "__value";
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface p-3">
                        <SelectBox value={c.indicator} onChange={(v) => updateCondition(i, { indicator: v })} options={INDICATORS} />
                        <SelectBox value={c.operator} onChange={(v) => updateCondition(i, { operator: v })} options={OPERATORS} />
                        <SelectBox
                          value={compareKey}
                          onChange={(v) => updateCondition(i, { value: v === "__value" ? 0 : v })}
                          options={[...INDICATORS, { key: "__value", label: "a custom value" }]}
                        />
                        {compareKey === "__value" && (
                          <ClampedNumberInput
                            value={typeof c.value === "number" ? c.value : 0}
                            onCommit={(v) => updateCondition(i, { value: v })}
                            className="w-28"
                            ariaLabel="Custom value"
                            allowNegative
                          />
                        )}
                        {conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setConditions((cs) => cs.filter((_, idx) => idx !== i))}
                            className="ml-auto rounded-[var(--radius-control)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-negative"
                            aria-label="Remove condition"
                          >
                            <X size={15} weight="bold" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setConditions((cs) => [...cs, { indicator: "price", operator: ">", value: "dayHigh" }])}
                >
                  <Plus size={14} className="mr-1" /> Add condition
                </Button>
              </div>

              {/* Stop / target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-line">
                <div>
                  <label className="text-xs font-medium text-fg">Stop loss distance</label>
                  <div className="mt-1.5">
                    <ClampedNumberInput value={stopLossPct} min={0.1} max={10} onCommit={setStopLossPct} trailing="%" className="w-28 tnum" ariaLabel="Stop loss distance" />
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1">How far the stop sits from your entry.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-fg">Reward to risk</label>
                  <div className="mt-1.5">
                    <ClampedNumberInput value={targetRatio} min={0.5} max={10} onCommit={setTargetRatio} trailing="R" className="w-28 tnum" ariaLabel="Reward to risk" />
                  </div>
                  <p className="text-[11px] text-fg-muted mt-1">Profit target as a multiple of the risk.</p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Step 5: Risk */}
        <Section step={5} title="Risk management" icon={<ShieldCheck size={16} className="text-warning" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(["riskPct", "rrTarget", "trailingStopPct", "dailyLoss", "maxTrades"] as NumericParam[]).map((key) => (
              <SliderField
                key={key}
                bound={PARAM_BOUNDS[key]}
                value={params[key]}
                onChange={(v) => handleNumParam(key, v)}
                premium={PREMIUM_PARAMS.has(key)}
              />
            ))}
          </div>
        </Section>
      </form>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-base/90 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <p className="hidden text-xs text-fg-subtle sm:block">
            Trading <span className="font-semibold text-fg">{instrument || "NQ"}</span> with the {strategyKind === "ORB" ? "Opening Range Breakout" : "Custom"} strategy
          </p>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>Cancel</Button>
            <Button type="button" disabled={loading || !selectedAccountId} onClick={handleSubmit} className="px-8">
              <Robot size={16} weight="bold" className="mr-1" />
              {loading ? "Deploying..." : "Deploy bot"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Section({ step, title, icon, children }: { step: number; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated overflow-hidden">
      <div className="p-6 border-b border-line bg-surface/50">
        <h2 className="text-lg font-semibold tracking-tight text-fg flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] bg-accent/20 text-accent text-xs font-bold tnum">{step}</span>
          {icon}
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StrategyCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-[var(--radius-control)] border p-5 text-left transition-colors",
        active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted",
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-[8px]", active ? "bg-accent/20 text-accent" : "bg-elevated border border-line text-fg-subtle")}>{icon}</div>
        <span className="font-semibold text-fg">{title}</span>
      </div>
      <p className="text-xs text-fg-subtle leading-relaxed">{desc}</p>
    </button>
  );
}

function PremiumTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
      <Star size={9} weight="fill" /> Premium
    </span>
  );
}

function SliderField({ bound, value, onChange, premium }: { bound: Bound; value: number; onChange: (v: number) => void; premium?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="text-xs font-medium text-fg inline-flex items-center gap-1.5">
          {bound.label}
          {premium && <PremiumTag />}
        </label>
        <ClampedNumberInput value={value} min={bound.min} max={bound.max} onCommit={onChange} trailing={bound.suffix || undefined} className="w-24 tnum" ariaLabel={bound.label} />
      </div>
      <input
        type="range"
        min={bound.min}
        max={bound.max}
        step={bound.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
        aria-label={bound.label}
      />
      <p className="text-[11px] text-fg-muted mt-1">{bound.help}</p>
    </div>
  );
}

function CheckField({ label, checked, onChange, premium }: { label: string; checked: boolean; onChange: (v: boolean) => void; premium?: boolean }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-accent w-4 h-4" />
      <span className="text-xs font-medium text-fg inline-flex items-center gap-1.5">
        {label}
        {premium && <PremiumTag />}
      </span>
    </label>
  );
}

function SelectBox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { key: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-[var(--radius-control)] border border-line bg-base px-2.5 text-xs text-fg focus:border-accent focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}
