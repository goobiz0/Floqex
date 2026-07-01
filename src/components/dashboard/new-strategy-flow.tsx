"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Stack,
  PencilSimpleLine,
  TrendUp,
  ShieldCheck,
  Lightning,
  ChartLineUp,
  Pulse,
  ArrowsClockwise,
  Sliders,
  Code,
  Sparkle,
  Star,
  Flask,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClampedNumberInput } from "@/components/ui/clamped-number-input";
import { InfoTip } from "@/components/ui/tooltip";
import { CustomSignalBuilder } from "@/components/dashboard/custom-signal-builder";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { DEFAULT_PARAMS } from "@/lib/strategy-schema";

// Loaded on demand: the code editor only appears in CODE mode, so it should not
// be bundled into the strategy flow that most users complete in BUILDER mode.
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
import { STRATEGY_TEMPLATES, templateById, type TemplateIconKey } from "@/lib/strategy-templates";
import { backtestStrategy, type Bar } from "@/lib/engine/backtest";
import { Sparkline } from "@/components/dashboard/charts/sparkline";
import { useEffect } from "react";
import { createStrategyAdvanced } from "@/app/dashboard/strategy/actions";

const TEMPLATE_ICON: Record<TemplateIconKey, Icon> = {
  breakout: TrendUp,
  shield: ShieldCheck,
  lightning: Lightning,
  trend: ChartLineUp,
  pulse: Pulse,
  reversion: ArrowsClockwise,
};

type StartPath = "template" | "custom";
type CustomMode = "BUILDER" | "CODE";

const ease = [0.23, 1, 0.32, 1] as const;

export function NewStrategyFlow({ plan }: { plan: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();

  const [path, setPath] = useState<StartPath | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Template path state.
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Custom path state.
  const [customMode, setCustomMode] = useState<CustomMode>("BUILDER");
  const builderDefaults = useMemo(() => defaultBuilderConfig(), []);
  const [direction, setDirection] = useState<TradeDirection>(builderDefaults.direction);
  const [groups, setGroups] = useState<ConditionGroup[]>(builderDefaults.groups);
  const [shortGroups, setShortGroups] = useState<ConditionGroup[]>(() => [defaultShortGroup()]);
  const codeDefaults = useMemo(() => defaultCodeConfig(), []);
  const [language, setLanguage] = useState<StrategyLanguage>(codeDefaults.language);
  const [code, setCode] = useState<string>(codeDefaults.code);
  const [stopLossPct, setStopLossPct] = useState(0.5);
  const [targetRatio, setTargetRatio] = useState(2);

  const isFree = plan === "FREE";

  function choosePath(next: StartPath) {
    setError(null);
    setPath(next);
    // Seed a friendly default name so the user can create in one click.
    if (next === "custom" && !name.trim()) {
      setName(customMode === "CODE" ? "My Code Strategy" : "My Custom Signal");
    }
  }

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = templateById(id);
    // Prefill the name from the template unless the user already typed one.
    if (t && (!name.trim() || STRATEGY_TEMPLATES.some((s) => s.name === name))) {
      setName(t.name);
    }
    setError(null);
  }

  function backToStart() {
    setPath(null);
    setTemplateId(null);
    setError(null);
  }

  function buildPayload(): { ok: true; kind: "ORB" | "CUSTOM"; params: Record<string, unknown> } | { ok: false; error: string } {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Give your strategy a name." };

    if (path === "template") {
      const t = templateId ? templateById(templateId) : undefined;
      if (!t) return { ok: false, error: "Pick a template to continue." };
      return { ok: true, kind: t.kind, params: t.buildParams() };
    }

    // Custom path. Strategies are asset-agnostic now — the assets are chosen on
    // the bot when the strategy is deployed, so we never ask for them here.
    if (customMode === "BUILDER" && groups.every((g) => g.conditions.length === 0)) {
      return { ok: false, error: "Add at least one entry condition." };
    }
    if (customMode === "BUILDER" && direction === "BOTH" && shortGroups.every((g) => g.conditions.length === 0)) {
      return { ok: false, error: "Add at least one short entry condition, or switch to long only." };
    }
    if (customMode === "CODE") {
      if (!code.trim()) return { ok: false, error: "Write some strategy code before saving." };
    }

    const params: Record<string, unknown> = {
      ...DEFAULT_PARAMS,
      stopLossPct,
      targetRatio,
      ...(customMode === "BUILDER"
        ? { mode: "BUILDER", direction, groups, ...(direction === "BOTH" ? { shortGroups } : {}) }
        : { mode: "CODE", language, code, direction: "BOTH" }),
    };
    return { ok: true, kind: "CUSTOM", params };
  }

  function submit() {
    const built = buildPayload();
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createStrategyAdvanced({ name: name.trim(), kind: built.kind, params: built.params });
      if (!res.ok || !res.id) {
        setError(res.error ?? "Could not create the strategy.");
        return;
      }
      toast.success("Strategy created. Tune it or assign it to an account next.");
      router.push("/dashboard/strategy");
      router.refresh();
    });
  }

  const stepTwoActive = path !== null;

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/strategy"
        className="inline-flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors"
      >
        <ArrowLeft size={16} /> Back to Strategies
      </Link>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Create a strategy</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Start from a proven template or build your own logic from scratch.
          </p>
        </div>
        <Stepper active={stepTwoActive} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!stepTwoActive ? (
          <motion.div
            key="choose"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.24, ease }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2"
          >
            <PathCard
              icon={<Stack size={22} weight="bold" />}
              title="Start from a template"
              desc="Pick a curated, ready-to-run strategy and tune it later. The fastest way to get going."
              onClick={() => choosePath("template")}
              meta={`${STRATEGY_TEMPLATES.length} templates`}
            />
            <PathCard
              icon={<PencilSimpleLine size={22} weight="bold" />}
              title="Write your own"
              desc="Compose entry rules from live indicators with no code, or write a JavaScript strategy with full control."
              onClick={() => choosePath("custom")}
              meta="No-code or code"
            />
          </motion.div>
        ) : (
          <motion.div
            key="configure"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, transition: { duration: 0.12 } }}
            transition={{ duration: 0.24, ease }}
            className="space-y-8"
          >
            <button
              type="button"
              onClick={backToStart}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
            >
              <ArrowLeft size={13} /> Change starting point
            </button>

            {path === "template" ? (
              <>
                <TemplateGallery selectedId={templateId} onSelect={pickTemplate} isFree={isFree} />
                {templateId && <TemplatePreview templateId={templateId} />}
              </>
            ) : (
              <CustomAuthor
                customMode={customMode}
                onModeChange={setCustomMode}
                direction={direction}
                onDirectionChange={setDirection}
                groups={groups}
                onGroupsChange={setGroups}
                shortGroups={shortGroups}
                onShortGroupsChange={setShortGroups}
                language={language}
                onLanguageChange={setLanguage}
                code={code}
                onCodeChange={setCode}
                stopLossPct={stopLossPct}
                setStopLossPct={setStopLossPct}
                targetRatio={targetRatio}
                setTargetRatio={setTargetRatio}
                isFree={isFree}
              />
            )}

            {/* Name + create */}
            <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="new-strategy-name">Strategy name</Label>
                  <Input
                    id="new-strategy-name"
                    value={name}
                    maxLength={60}
                    placeholder="e.g. NQ Opening Range"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !pending) submit();
                    }}
                    invalid={Boolean(error)}
                  />
                </div>
                <Button onClick={submit} disabled={pending} className="px-7 sm:mb-px">
                  <Flask size={16} weight="fill" className="mr-1" />
                  {pending ? "Creating…" : "Create strategy"}
                </Button>
              </div>
              {error && (
                <p className="mt-3 text-xs text-negative" role="alert">
                  {error}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className={cn("inline-flex items-center gap-1.5", "text-fg")}>
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-[var(--radius-pill)] text-[10px] font-bold tnum",
            active ? "bg-accent-soft text-accent" : "bg-accent text-[var(--color-on-accent)]",
          )}
        >
          {active ? <Check size={11} weight="bold" /> : 1}
        </span>
        Start
      </span>
      <span className="h-px w-6 bg-line" />
      <span className={cn("inline-flex items-center gap-1.5", active ? "text-fg" : "text-fg-faint")}>
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-[var(--radius-pill)] text-[10px] font-bold tnum",
            active ? "bg-accent text-[var(--color-on-accent)]" : "bg-surface border border-line text-fg-subtle",
          )}
        >
          2
        </span>
        Configure
      </span>
    </div>
  );
}

function PathCard({
  icon,
  title,
  desc,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-7 text-left transition-all hover:border-line-strong hover:-translate-y-[2px] hover:shadow-[var(--shadow-lg)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.06] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
        {icon}
      </div>
      <h2 className="relative z-10 mt-5 text-lg font-bold text-fg">{title}</h2>
      <p className="relative z-10 mt-2 text-sm leading-relaxed text-fg-subtle">{desc}</p>
      <div className="relative z-10 mt-5 flex w-full items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">{meta}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-transform group-hover:translate-x-0.5">
          Continue <ArrowRight size={15} weight="bold" />
        </span>
      </div>
    </button>
  );
}

function TemplateGallery({
  selectedId,
  onSelect,
  isFree,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  isFree: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkle size={15} weight="fill" className="text-accent" />
        <h2 className="text-sm font-semibold text-fg">Choose a template</h2>
        <InfoTip content="Each template is a complete, runnable starting point. You can fine-tune every parameter after it is created." />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {STRATEGY_TEMPLATES.map((t) => {
          const TIcon = TEMPLATE_ICON[t.iconKey];
          const active = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col items-start overflow-hidden rounded-[var(--radius-card)] border p-5 text-left transition-all",
                active
                  ? "border-accent bg-accent/5 ring-1 ring-accent"
                  : "border-line bg-surface hover:border-line-strong hover:-translate-y-[1px]",
              )}
            >
              {active && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] bg-accent text-[var(--color-on-accent)]">
                  <Check size={13} weight="bold" />
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)]",
                    active ? "bg-accent/20 text-accent" : "bg-elevated border border-line text-fg-subtle",
                  )}
                >
                  <TIcon size={20} weight="bold" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[var(--radius-pill)] border border-line bg-base px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                    {t.category}
                  </span>
                  {t.premium && <ProTag />}
                </div>
              </div>
              <h3 className="mt-4 text-base font-bold text-fg">{t.name}</h3>
              <p className="mt-1 text-xs font-medium text-accent/90">{t.tagline}</p>
              <p className="mt-2.5 text-xs leading-relaxed text-fg-subtle">{t.description}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-faint">
                {t.kind === "ORB" ? <Sliders size={12} weight="bold" /> : <Code size={12} weight="bold" />}
                {t.kind === "ORB" ? "Opening range engine" : "Custom signal engine"}
              </span>
            </button>
          );
        })}
      </div>
      {isFree && (
        <p className="flex items-start gap-2 rounded-[var(--radius-control)] border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-fg-muted">
          <Star size={14} weight="fill" className="mt-px shrink-0 text-accent" />
          Pro templates are fully active on your paper account so you can test them. Live trading and the marked Pro
          features require an upgrade.
        </p>
      )}
    </div>
  );
}

function TemplatePreview({ templateId }: { templateId: string }) {
  const t = templateById(templateId);
  const params = useMemo(() => (t ? t.buildParams() : null), [t]);
  const instrument = typeof params?.instrument === "string" && params.instrument ? params.instrument : "NQ";
  // Only the ORB engine maps onto the breakout backtest, so only ORB templates
  // fetch history and render a preview.
  const isOrb = t?.kind === "ORB";
  const [bars, setBars] = useState<Bar[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOrb) return;
    let cancelled = false;
    (async () => {
      setBars(null);
      setError(false);
      try {
        const res = await fetch(`/api/market/history?symbol=${encodeURIComponent(instrument)}&days=180`);
        if (!res.ok) throw new Error("history unavailable");
        const data = await res.json();
        if (!cancelled) setBars(data.bars ?? []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [instrument, isOrb]);

  // Distinguish "still fetching" (bars === null) from "history too short" so the
  // skeleton resolves to an honest message rather than spinning forever.
  const loading = !error && bars === null;
  const notEnoughHistory = !error && bars !== null && bars.length < 5;

  const backtest = useMemo(() => {
    if (!t || !params || !bars || bars.length < 5) return null;
    return backtestStrategy(bars, {
      riskPct: typeof params.riskPct === "number" ? params.riskPct : undefined,
      rrTarget: typeof params.rrTarget === "number" ? params.rrTarget : undefined,
      stopLossPct: typeof params.stopLossPct === "number" ? params.stopLossPct : undefined,
      trendFilter: Boolean(params.trendFilter),
      direction: params.direction === "SHORT" ? "SHORT" : params.direction === "LONG" ? "LONG" : "BOTH",
      trailingStopPct: typeof params.trailingStopPct === "number" ? params.trailingStopPct : undefined,
      atrStopMultiple: typeof params.atrStopMultiple === "number" ? params.atrStopMultiple : undefined,
    });
  }, [t, params, bars]);

  if (!t) return null;

  // The breakout backtest only models the opening-range engine. For custom-signal
  // templates it would not reflect the actual rules, so we are honest and skip
  // the simulated numbers rather than show a misleading curve.
  if (t.kind !== "ORB") {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-5">
        <p className="text-sm font-semibold text-fg">{t.name}</p>
        <p className="mt-1 text-xs text-fg-subtle">
          Custom-signal templates run on the indicator engine. Create it, then open the Lab to backtest the exact rules over real history.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-fg">Backtest preview</p>
        <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
          {instrument} · 180d · estimate
        </span>
      </div>
      <div className="mt-4 min-h-[64px]">
        {error ? (
          <p className="text-xs text-fg-subtle">Couldn&apos;t load historical data for a preview.</p>
        ) : notEnoughHistory ? (
          <p className="text-xs text-fg-subtle">Not enough history for {instrument} to preview a backtest.</p>
        ) : loading || !backtest ? (
          <div className="h-16 w-full animate-pulse rounded-[var(--radius-control)] bg-surface" />
        ) : backtest.trades === 0 ? (
          <p className="text-xs text-fg-subtle">Not enough qualifying setups in the window to preview.</p>
        ) : (
          <>
            <div className="h-16 w-full">
              <Sparkline values={backtest.series.map((p) => p.equity)} tone="auto" fill />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                { k: "Return", v: `${backtest.totalReturnPct >= 0 ? "+" : ""}${backtest.totalReturnPct.toFixed(0)}%`, tone: backtest.totalReturnPct >= 0 ? "text-profit" : "text-negative" },
                { k: "Win rate", v: `${backtest.winRate.toFixed(0)}%`, tone: "text-fg" },
                { k: "Max DD", v: `-${backtest.maxDrawdownPct.toFixed(0)}%`, tone: "text-negative" },
              ].map((s) => (
                <div key={s.k} className="rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 text-center">
                  <dt className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{s.k}</dt>
                  <dd className={cn("tnum mt-0.5 text-sm font-semibold", s.tone)}>{s.v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

function CustomAuthor({
  customMode,
  onModeChange,
  direction,
  onDirectionChange,
  groups,
  onGroupsChange,
  shortGroups,
  onShortGroupsChange,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  stopLossPct,
  setStopLossPct,
  targetRatio,
  setTargetRatio,
  isFree,
}: {
  customMode: CustomMode;
  onModeChange: (m: CustomMode) => void;
  direction: TradeDirection;
  onDirectionChange: (d: TradeDirection) => void;
  groups: ConditionGroup[];
  onGroupsChange: (g: ConditionGroup[]) => void;
  shortGroups: ConditionGroup[];
  onShortGroupsChange: (g: ConditionGroup[]) => void;
  language: StrategyLanguage;
  onLanguageChange: (l: StrategyLanguage) => void;
  code: string;
  onCodeChange: (c: string) => void;
  stopLossPct: number;
  setStopLossPct: (v: number) => void;
  targetRatio: number;
  setTargetRatio: (v: number) => void;
  isFree: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-fg">How do you want to define the entry?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ModeCard
            active={customMode === "BUILDER"}
            onClick={() => onModeChange("BUILDER")}
            icon={<Sliders size={20} weight="bold" />}
            title="Custom signal"
            desc="Compose entry rules from 16 live indicators with AND / OR logic. No code required."
          />
          <ModeCard
            active={customMode === "CODE"}
            onClick={() => onModeChange("CODE")}
            icon={<Code size={20} weight="bold" />}
            title="Custom code"
            desc="Write your own strategy in JavaScript, Python, Pine Script or TradingView."
            badge="Runs live"
          />
        </div>
      </div>

      {/* Assets note: they belong to the bot now, not the strategy */}
      <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-line bg-surface/50 px-3.5 py-3 text-xs text-fg-muted">
        <Sparkle size={14} weight="fill" className="mt-px shrink-0 text-accent" />
        <span>
          This is reusable, asset-agnostic logic. You pick which asset(s) to trade when you deploy it to a bot in
          <span className="font-medium text-fg"> Bots &amp; Automations</span>, so one strategy can run on several markets.
        </span>
      </div>

      {/* Entry logic */}
      <Panel
        title={customMode === "BUILDER" ? "Entry rules" : "Strategy code"}
        icon={customMode === "CODE" ? <Lightning size={15} className="text-accent" /> : <Sliders size={15} className="text-accent" />}
      >
        {customMode === "BUILDER" ? (
          <CustomSignalBuilder
            groups={groups}
            onGroupsChange={onGroupsChange}
            direction={direction}
            onDirectionChange={onDirectionChange}
            shortGroups={shortGroups}
            onShortGroupsChange={onShortGroupsChange}
          />
        ) : (
          <StrategyCodeEditor
            language={language}
            onLanguageChange={onLanguageChange}
            code={code}
            onCodeChange={onCodeChange}
            sampleSymbol="NQ"
            isFree={isFree}
          />
        )}
      </Panel>

      {/* Risk defaults */}
      <Panel title="Risk defaults" icon={<ShieldCheck size={15} className="text-warning" />}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="risk-stop-loss" className="inline-flex items-center gap-1.5 text-xs font-medium text-fg">
              Stop loss distance
              <InfoTip content="How far the protective stop sits from entry, as a percentage. A tighter stop means a larger position for the same dollar risk." />
            </label>
            <div className="mt-1.5">
              <ClampedNumberInput id="risk-stop-loss" value={stopLossPct} min={0.1} max={20} onCommit={setStopLossPct} trailing="%" className="w-28 tnum" ariaLabel="Stop loss distance" />
            </div>
          </div>
          <div>
            <label htmlFor="risk-target-ratio" className="inline-flex items-center gap-1.5 text-xs font-medium text-fg">
              Reward to risk
              <InfoTip content="Profit target as a multiple of the risk. 2 means the target is twice as far as the stop." />
            </label>
            <div className="mt-1.5">
              <ClampedNumberInput id="risk-target-ratio" value={targetRatio} min={0.25} max={20} onCommit={setTargetRatio} trailing="R" className="w-28 tnum" ariaLabel="Reward to risk" />
            </div>
          </div>
          {customMode === "CODE" && (
            <p className="text-[11px] leading-relaxed text-fg-faint sm:col-span-2">
              These are the defaults. Your code can override them per signal by returning stopLossPct and targetRatio.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Panel({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-elevated">
      <div className="rounded-t-[calc(var(--radius-card)-1px)] border-b border-line bg-surface/50 px-6 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
          {icon}
          {title}
          {hint && <InfoTip content={hint} />}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col items-start rounded-[var(--radius-control)] border p-5 text-left transition-colors",
        active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className={cn("rounded-[8px] p-2", active ? "bg-accent/20 text-accent" : "bg-elevated border border-line text-fg-subtle")}>
          {icon}
        </div>
        <span className="font-semibold text-fg">{title}</span>
        {badge && (
          <span className="rounded-[var(--radius-pill)] bg-profit/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-profit">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-fg-subtle">{desc}</p>
    </button>
  );
}

function ProTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
      <Star size={9} weight="fill" /> Pro
    </span>
  );
}
