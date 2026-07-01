"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Robot,
  CaretLeft,
  Wallet,
  Sliders,
  TrendUp,
  ShieldCheck,
  Star,
  Code,
  Lightning,
  Stack,
  Sparkle,
  Warning,
  SealCheck,
  Flask,
} from "@phosphor-icons/react";
import { createBot } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { InfoTip } from "@/components/ui/tooltip";
import { FeedbackSurvey } from "@/components/ui/feedback-survey";
import { AssetMultiSelect } from "@/components/dashboard/asset-multi-select";
import { CustomSignalBuilder } from "@/components/dashboard/custom-signal-builder";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn, formatUSD } from "@/lib/utils";
import { DEFAULT_PARAMS, PARAM_BOUNDS, type Bound, type NumericParam } from "@/lib/strategy-schema";

// The code editor (Monaco-style editor surface, language snippets, transpiler
// helpers) is only shown when the user picks CODE mode, so it is loaded on
// demand rather than shipped with the bot-creation route.
const StrategyCodeEditor = dynamic(
  () =>
    import("@/components/dashboard/strategy-code-editor").then(
      (m) => m.StrategyCodeEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-card border border-line bg-surface" />
    ),
  }
);
import {
  defaultBuilderConfig,
  defaultCodeConfig,
  defaultShortGroup,
  type ConditionGroup,
  type StrategyLanguage,
  type TradeDirection,
} from "@/lib/custom-strategy";

type AccountProp = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: number;
};

type StrategyMode = "EXISTING" | "ORB" | "BUILDER" | "CODE";

// Premium parameters (live only on paid plans). Marked in the UI so users know
// what they get for upgrading.
const PREMIUM_PARAMS = new Set<string>(["minRange", "maxRange", "maxTrades", "trendFilter", "reEntry"]);

const QUICK_SYMBOLS = ["NQ", "ES", "AAPL", "NVDA", "BTC", "SPY"];

// Beginner-friendly presets for the rule builder.
const BUILDER_PRESETS: { id: string; label: string; help: string; direction: "LONG" | "SHORT"; groups: ConditionGroup[] }[] = [
  {
    id: "trend-pullback",
    label: "Trend pullback",
    help: "Buy dips while the trend is up: price above the 50 SMA and RSI below 40.",
    direction: "LONG",
    groups: [
      {
        join: "ALL",
        conditions: [
          { left: "price", op: ">", right: { kind: "indicator", key: "sma50" } },
          { left: "rsi14", op: "<", right: { kind: "value", value: 40 } },
        ],
      },
    ],
  },
  {
    id: "breakout",
    label: "Momentum breakout",
    help: "Enter strength: price at the day high with positive MACD momentum.",
    direction: "LONG",
    groups: [
      {
        join: "ALL",
        conditions: [
          { left: "rangePosition", op: ">", right: { kind: "value", value: 90 } },
          { left: "macd", op: ">", right: { kind: "value", value: 0 } },
        ],
      },
    ],
  },
  {
    id: "mean-reversion",
    label: "Mean reversion",
    help: "Fade extremes: RSI deeply oversold while price holds above the 200 SMA.",
    direction: "LONG",
    groups: [
      {
        join: "ALL",
        conditions: [
          { left: "rsi14", op: "<", right: { kind: "value", value: 25 } },
          { left: "price", op: ">", right: { kind: "indicator", key: "sma200" } },
        ],
      },
    ],
  },
];

type StrategyProp = { id: string; name: string; kind: string; version: number; edgeScore?: number | null; edgeVerdict?: string | null };

export function BotsNewClient({
  availableAccounts,
  availableStrategies,
  plan
}: {
  availableAccounts: AccountProp[];
  availableStrategies: StrategyProp[];
  plan: string
}) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(availableAccounts[0]?.id ?? "");
  const [instruments, setInstruments] = useState<string[]>(["NQ"]);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>(availableStrategies.length > 0 ? "EXISTING" : "ORB");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(availableStrategies[0]?.id ?? "");
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [loading, setLoading] = useState(false);

  // Builder strategy state.
  const builderDefaults = useMemo(() => defaultBuilderConfig(), []);
  const [direction, setDirection] = useState<TradeDirection>(builderDefaults.direction);
  const [groups, setGroups] = useState<ConditionGroup[]>(builderDefaults.groups);
  const [shortGroups, setShortGroups] = useState<ConditionGroup[]>(() => [defaultShortGroup()]);

  // Code strategy state.
  const codeDefaults = useMemo(() => defaultCodeConfig(), []);
  const [language, setLanguage] = useState<StrategyLanguage>(codeDefaults.language);
  const [code, setCode] = useState<string>(codeDefaults.code);

  // Shared custom risk (used by builder + code).
  const [stopLossPct, setStopLossPct] = useState(0.5);
  const [targetRatio, setTargetRatio] = useState(2);

  const isFree = plan === "FREE";

  const selectedAccount = availableAccounts.find((a) => a.id === selectedAccountId);
  const selectedStrategy = availableStrategies.find((s) => s.id === selectedStrategyId);
  const goingLive = selectedAccount?.mode === "LIVE";

  function handleNumParam(key: NumericParam, value: number) {
    setParams((p) => ({ ...p, [key]: value }));
  }
  function handleBoolParam(key: "trendFilter" | "reEntry" | "newsPause" | "extendedHours", value: boolean) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  function applyPreset(preset: (typeof BUILDER_PRESETS)[number]) {
    setDirection(preset.direction);
    setGroups(preset.groups.map((g) => ({ ...g, conditions: g.conditions.map((c) => ({ ...c })) })));
    toast.success(`Loaded the ${preset.label} preset.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) {
      toast.error("Please select an account.");
      return;
    }
    if (instruments.length === 0) {
      toast.error("Choose at least one asset for the bot to trade.");
      return;
    }
    if (strategyMode === "BUILDER" && groups.every((g) => g.conditions.length === 0)) {
      toast.error("Add at least one entry condition.");
      return;
    }
    if (strategyMode === "BUILDER" && direction === "BOTH" && shortGroups.every((g) => g.conditions.length === 0)) {
      toast.error("Add at least one short entry condition, or switch to long only.");
      return;
    }
    if (strategyMode === "CODE" && !code.trim()) {
      toast.error("Write some strategy code before deploying.");
      return;
    }

    if (strategyMode === "EXISTING") {
      if (!selectedStrategyId) {
        toast.error("Please select a strategy.");
        return;
      }
      setLoading(true);
      const res = await createBot({ accountId: selectedAccountId, strategyId: selectedStrategyId, instruments });
      setLoading(false);

      if (res.ok) {
        toast.success("Bot created and linked to strategy.");
        router.push("/dashboard/bots");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to create bot.");
      }
      return;
    }

    const strategyKind = strategyMode === "ORB" ? "ORB" : "CUSTOM";
    // The strategy stays asset-agnostic; the bot carries the instruments.
    const finalParams: Record<string, unknown> = { ...params };

    if (strategyMode === "BUILDER") {
      Object.assign(finalParams, {
        mode: "BUILDER",
        direction,
        groups,
        ...(direction === "BOTH" ? { shortGroups } : {}),
        stopLossPct,
        targetRatio,
      });
    } else if (strategyMode === "CODE") {
      Object.assign(finalParams, { mode: "CODE", language, code, direction: "BOTH", stopLossPct, targetRatio });
    }

    const symbolSummary = `${instruments[0]}${instruments.length > 1 ? ` +${instruments.length - 1}` : ""}`;
    const name =
      strategyMode === "ORB"
        ? `Opening Range Breakout · ${symbolSummary}`
        : strategyMode === "BUILDER"
          ? `Custom Signal · ${symbolSummary}`
          : `Custom Code · ${symbolSummary}`;

    setLoading(true);
    const res = await createBot({ accountId: selectedAccountId, strategyName: name, strategyKind, params: finalParams, instruments });
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
        <Section step={1} title="Target account" hint="The broker account this bot is attached to. Each account runs one bot.">
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

        {/* Step 2: Instruments (multi-asset) — assets live on the bot, so this is
            always shown, including when attaching an existing strategy. */}
        <Section
          step={2}
          title="What should this bot trade?"
          hint="Search any stock, ETF, index or crypto. Add several and the bot manages each one independently with your risk limits. The strategy stays asset-agnostic, so the same one can run on different markets across bots."
          badge={instruments.length > 1 ? <PaidPill label="Multi-asset" /> : undefined}
        >
          <AssetMultiSelect value={instruments} onChange={setInstruments} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-subtle">Quick add:</span>
            {QUICK_SYMBOLS.map((s) => {
              const active = instruments.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInstruments((cur) => (active ? cur.filter((x) => x !== s) : [...cur, s]))}
                  className={cn(
                    "rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-medium transition-colors",
                    active ? "border-accent/40 bg-accent-soft text-accent" : "border-line bg-surface text-fg-subtle hover:text-fg hover:bg-surface-hover",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 3: Strategy Type */}
        <Section step={3} title="Strategy" hint={strategyMode === "EXISTING" ? "Pick an existing strategy from your lab." : "Pick how this bot finds trades. Risk management below applies to all three."}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StrategyCard
              active={strategyMode === "EXISTING"}
              onClick={() => setStrategyMode("EXISTING")}
              icon={<Stack size={20} weight="bold" />}
              title="Existing Strategy"
              desc="Link to a strategy already in your lab."
            />
            <StrategyCard
              active={strategyMode === "ORB"}
              onClick={() => setStrategyMode("ORB")}
              icon={<TrendUp size={20} weight="bold" />}
              title="Opening Range Breakout"
              desc="Captures momentum as price breaks the day's opening range."
            />
            <StrategyCard
              active={strategyMode === "BUILDER"}
              onClick={() => setStrategyMode("BUILDER")}
              icon={<Sliders size={20} weight="bold" />}
              title="Custom signal"
              desc="Compose entry rules from live indicators with AND / OR logic."
            />
            <StrategyCard
              active={strategyMode === "CODE"}
              onClick={() => setStrategyMode("CODE")}
              icon={<Code size={20} weight="bold" />}
              title="Custom code"
              desc="Write your own strategy in JavaScript, Python, Pine Script or TradingView."
              premium
            />
          </div>
        </Section>

        {/* Step 4: Logic */}
        <Section
          step={4}
          title={strategyMode === "ORB" ? "Execution logic" : strategyMode === "BUILDER" ? "Custom entry rules" : strategyMode === "CODE" ? "Strategy code" : "Strategy settings"}
          icon={strategyMode === "CODE" ? <Lightning size={16} className="text-accent" /> : undefined}
        >
          {strategyMode === "EXISTING" ? (
            <div className="space-y-6 max-w-xl">
              {availableStrategies.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-fg mb-2 block">Select strategy to attach</label>
                  <div className="grid grid-cols-1 gap-3">
                    {availableStrategies.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStrategyId(s.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-[var(--radius-control)] border text-left transition-colors",
                          selectedStrategyId === s.id ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted"
                        )}
                      >
                        <div>
                          <p className="font-semibold text-fg">{s.name}</p>
                          <p className="text-xs text-fg-subtle uppercase tracking-wider mt-1">{s.kind} • v{s.version}</p>
                        </div>
                        {selectedStrategyId === s.id && (
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedStrategy && <EdgeGate strategy={selectedStrategy} goingLive={goingLive} />}
                </div>
              ) : (
                <div className="p-6 rounded-[var(--radius-card)] bg-surface border border-line text-center">
                  <p className="text-sm text-fg-subtle">You don&apos;t have any existing strategies. Create one above.</p>
                </div>
              )}
            </div>
          ) : strategyMode === "ORB" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(["rangeMinutes", "minRange", "maxRange", "minVolume"] as NumericParam[]).map((key) => (
                  <SliderField key={key} bound={PARAM_BOUNDS[key]} value={params[key]} onChange={(v) => handleNumParam(key, v)} premium={PREMIUM_PARAMS.has(key)} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-line">
                <CheckField label="Trend filter" premium checked={params.trendFilter} onChange={(v) => handleBoolParam("trendFilter", v)} help="Only take trades that agree with the longer-term trend." />
                <CheckField label="Allow re-entries" premium checked={params.reEntry} onChange={(v) => handleBoolParam("reEntry", v)} help="Re-enter after a pullback inside the range." />
                <CheckField label="Pause on high-impact news" checked={params.newsPause} onChange={(v) => handleBoolParam("newsPause", v)} help="Stand aside around scheduled high-impact news." />
                <CheckField label="Extended hours" checked={params.extendedHours} onChange={(v) => handleBoolParam("extendedHours", v)} help="Allow trading during pre-market and after-hours sessions." />
              </div>
            </div>
          ) : strategyMode === "BUILDER" ? (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkle size={14} weight="fill" className="text-accent" />
                  <p className="text-xs font-medium text-fg">Start from a preset</p>
                  <InfoTip content="Presets fill in a sensible set of rules you can then tweak. A fast way to learn what each indicator does." />
                </div>
                <div className="flex flex-wrap gap-2">
                  {BUILDER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      title={p.help}
                      className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <CustomSignalBuilder
                groups={groups}
                onGroupsChange={setGroups}
                direction={direction}
                onDirectionChange={setDirection}
                shortGroups={shortGroups}
                onShortGroupsChange={setShortGroups}
              />

              <CustomRiskFields stopLossPct={stopLossPct} setStopLossPct={setStopLossPct} targetRatio={targetRatio} setTargetRatio={setTargetRatio} />
            </div>
          ) : (
            <div className="space-y-6">
              <StrategyCodeEditor
                language={language}
                onLanguageChange={setLanguage}
                code={code}
                onCodeChange={setCode}
                sampleSymbol={instruments[0]}
                isFree={isFree}
              />
              <CustomRiskFields
                stopLossPct={stopLossPct}
                setStopLossPct={setStopLossPct}
                targetRatio={targetRatio}
                setTargetRatio={setTargetRatio}
                note="These are the defaults. Your code can override them per signal by returning stopLossPct and targetRatio."
              />
            </div>
          )}
        </Section>

        {/* Step 5: Risk */}
        {strategyMode !== "EXISTING" && (
          <Section step={5} title="Risk management" icon={<ShieldCheck size={16} className="text-warning" />} hint="Hard limits the engine enforces on every trade, no matter the strategy.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(["riskPct", "rrTarget", "trailingStopPct", "dailyLoss", "maxTrades"] as NumericParam[]).map((key) => (
                <SliderField key={key} bound={PARAM_BOUNDS[key]} value={params[key]} onChange={(v) => handleNumParam(key, v)} premium={PREMIUM_PARAMS.has(key)} />
              ))}
            </div>
            {isFree && (
              <p className="mt-5 flex items-start gap-2 rounded-[var(--radius-control)] border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-fg-muted">
                <Star size={14} weight="fill" className="mt-px shrink-0 text-accent" />
                Premium features are fully active on your paper account so you can test them. Live trading and the marked Pro features require an upgrade.
              </p>
            )}
          </Section>
        )}
      </form>

      {/* Action buttons at the end of the form */}
      <div className="mt-8 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>Cancel</Button>
        <Button
          type="button"
          disabled={loading || !selectedAccountId}
          onClick={handleSubmit}
          className="px-8 rounded-[var(--radius-pill)]"
        >
          <Robot size={16} weight="bold" className="mr-1" />
          {loading ? "Deploying..." : "Deploy bot"}
        </Button>
      </div>

      <div className="mt-12">
        <FeedbackSurvey featureId="bot-creation" title="Is the bot creation process clear?" />
      </div>
    </motion.div>
  );
}

function EdgeGate({ strategy, goingLive }: { strategy: StrategyProp; goingLive: boolean }) {
  const verdict = strategy.edgeVerdict ?? null;
  const score = strategy.edgeScore ?? null;
  const tuneHref = `/dashboard/strategy?view=edit&strategyId=${strategy.id}`;

  // Not yet validated: nudge to run the Validation Lab, firmly if going live.
  if (!verdict) {
    return (
      <div className={cn(
        "mt-4 flex items-start gap-3 rounded-[var(--radius-control)] border p-3 text-xs",
        goingLive ? "border-warning/30 bg-warning-soft text-fg-muted" : "border-line bg-surface text-fg-muted",
      )}>
        <Flask size={16} weight="duotone" className="mt-px shrink-0 text-warning" />
        <p>
          This strategy has not been validated yet.{" "}
          {goingLive && <span className="font-medium text-fg">Before risking live capital, </span>}
          run the Validation Lab to get an Edge Score.{" "}
          <Link href={tuneHref} className="font-medium text-accent hover:underline">Validate now</Link>
        </p>
      </div>
    );
  }

  if (verdict === "Fragile") {
    return (
      <div className={cn(
        "mt-4 flex items-start gap-3 rounded-[var(--radius-control)] border p-3 text-xs",
        goingLive ? "border-negative/40 bg-negative-soft text-fg" : "border-warning/30 bg-warning-soft text-fg-muted",
      )}>
        <Warning size={16} weight="duotone" className="mt-px shrink-0 text-negative" />
        <p>
          Edge Score <span className="tnum font-semibold">{score ?? 0}/100</span> reads as{" "}
          <span className="font-semibold text-negative">Fragile</span> (likely curve-fit).
          {goingLive ? " Deploying to a live account is risky. " : " Consider refining it. "}
          <Link href={tuneHref} className="font-medium text-accent hover:underline">Review in the lab</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-control)] border border-accent/20 bg-accent-soft p-3 text-xs text-fg-muted">
      <SealCheck size={16} weight="duotone" className="mt-px shrink-0 text-positive" />
      <p>
        Edge Score <span className="tnum font-semibold text-fg">{score ?? 0}/100</span> reads as{" "}
        <span className="font-semibold text-positive">{verdict}</span>. Validated on real intraday data.
      </p>
    </div>
  );
}

function CustomRiskFields({
  stopLossPct,
  setStopLossPct,
  targetRatio,
  setTargetRatio,
  note,
}: {
  stopLossPct: number;
  setStopLossPct: (v: number) => void;
  targetRatio: number;
  setTargetRatio: (v: number) => void;
  note?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-line">
      <div>
        <label className="text-xs font-medium text-fg inline-flex items-center gap-1.5">
          Stop loss distance
          <InfoTip content="How far the protective stop sits from your entry, as a percentage. A tighter stop means a larger position for the same dollar risk." />
        </label>
        <div className="mt-1.5">
          <ClampedNumberInput value={stopLossPct} min={0.1} max={20} onCommit={setStopLossPct} trailing="%" className="w-28 tnum" ariaLabel="Stop loss distance" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-fg inline-flex items-center gap-1.5">
          Reward to risk
          <InfoTip content="Profit target as a multiple of the risk. 2 means the target is twice as far as the stop." />
        </label>
        <div className="mt-1.5">
          <ClampedNumberInput value={targetRatio} min={0.25} max={20} onCommit={setTargetRatio} trailing="R" className="w-28 tnum" ariaLabel="Reward to risk" />
        </div>
      </div>
      {note && <p className="sm:col-span-2 text-[11px] leading-relaxed text-fg-faint">{note}</p>}
    </div>
  );
}

function SummaryChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface px-2.5 py-1 text-fg-muted">
      <span className="text-fg-subtle">{icon}</span>
      <span className="tnum">{label}</span>
    </span>
  );
}

function Section({
  step,
  title,
  icon,
  hint,
  badge,
  children,
}: {
  step: number;
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated">
      <div className="p-6 border-b border-line bg-surface/50 rounded-t-[calc(var(--radius-card)-1px)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-fg flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] bg-accent/20 text-accent text-xs font-bold tnum">{step}</span>
            {icon}
            {title}
            {hint && <InfoTip content={hint} />}
          </h2>
          {badge}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StrategyCard({ active, onClick, icon, title, desc, premium }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; premium?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start rounded-[var(--radius-control)] border p-5 text-left transition-colors",
        active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-fg-muted",
      )}
    >
      {premium && <span className="absolute right-3 top-3"><PremiumTag /></span>}
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
      <Star size={9} weight="fill" /> Pro
    </span>
  );
}

function PaidPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
      <Star size={10} weight="fill" /> {label}
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
          <InfoTip content={bound.help} />
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

function CheckField({ label, checked, onChange, premium, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; premium?: boolean; help?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-accent w-4 h-4 mt-0.5" />
      <span className="text-xs font-medium text-fg">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {premium && <PremiumTag />}
          {help && <InfoTip content={help} />}
        </span>
      </span>
    </label>
  );
}
