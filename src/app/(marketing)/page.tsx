import {
  ArrowRight,
  Camera,
  ChartLineUp,
  Check,
  Flask,
  HandPalm,
  Notebook,
  PlugsConnected,
  Robot,
  ShieldCheck,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Reveal } from "@/components/marketing/reveal";
import { EquityChart } from "@/components/marketing/equity-chart";
import { LogoWall } from "@/components/marketing/logo-wall";
import { getDemoPreview, type DemoPreview } from "@/lib/queries";
import { formatUSD } from "@/lib/utils";
import { authUrl } from "@/lib/urls";

// Demo preview is real data from the seeded demo account; refresh it on a short
// ISR window so the marketing page stays static-fast but never stale for long.
export const revalidate = 300;

export default async function LandingPage() {
  const demo = await getDemoPreview();
  const botRunning = demo ? demo.botRunning : true;

  return (
    <>
      {/* ───────────────── Hero: asymmetric split ───────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="grid-faint pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
        />
        <div
          aria-hidden
          className="glow-accent pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1200px] grid-cols-1 items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-20">
          {/* Copy */}
          <div className="max-w-xl">
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-fg md:text-5xl lg:text-6xl">
              Automated trading, with nothing hidden.
            </h1>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-fg-muted">
              Connect a broker, set your risk limits, and let the bot trade,
              narrating every decision in plain English.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href={authUrl("/sign-up")} size="lg">
                Get started
                <ArrowRight size={18} weight="bold" />
              </Button>
              <Button href="#how" variant="secondary" size="lg">
                See how it works
              </Button>
            </div>
          </div>

          {/* Visual */}
          <Reveal delay={0.1}>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-fg-subtle">
                  Account equity
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  <StatusDot tone={botRunning ? "positive" : "neutral"} pulse={botRunning} />
                  {botRunning ? "Bot running" : "Bot paused"}
                </span>
              </div>
              <div className="mt-4">
                <EquityChart />
              </div>
              <p className="mt-3 text-xs text-fg-faint">
                {demo
                  ? "Live demo account, paper trading. Past performance is not indicative of future results."
                  : "Sample equity curve. Your results will differ."}
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      <LogoWall />

      {/* ───────────────── Features: 2 + 1 bento ───────────────── */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">
              Everything you need to run a bot, in one place.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-fg-muted">
              A dashboard for the numbers, a lab for the rules, and a journal
              that remembers why every trade happened.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2">
            {/* Large left cell */}
            <Reveal className="lg:col-span-2 lg:row-span-2">
              <Card className="flex h-full flex-col overflow-hidden p-6 lg:p-8">
                <div className="flex items-center gap-2 text-accent">
                  <ChartLineUp size={22} />
                  <span className="text-sm font-medium text-fg">Dashboard</span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
                  One screen for the only question that matters.
                </h3>
                <p className="mt-2 max-w-md text-pretty leading-relaxed text-fg-muted">
                  Live equity, open positions, and the metrics that tell you if
                  the edge is real. No spreadsheet required.
                </p>
                <div className="mt-auto pt-8">
                  <MiniDashboard demo={demo} />
                </div>
              </Card>
            </Reveal>

            {/* Right top */}
            <Reveal delay={0.05}>
              <Card className="flex h-full flex-col p-6">
                <div className="flex items-center gap-2 text-accent">
                  <Flask size={22} />
                  <span className="text-sm font-medium text-fg">
                    Strategy Lab
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-fg">
                  Tune the rules without code.
                </h3>
                <p className="mt-2 text-pretty leading-relaxed text-fg-muted">
                  Every parameter is a labelled input with safe bounds. Save and
                  the change is logged with a before and after.
                </p>
              </Card>
            </Reveal>

            {/* Right bottom */}
            <Reveal delay={0.1}>
              <Card className="flex h-full flex-col p-6">
                <div className="flex items-center gap-2 text-accent">
                  <Notebook size={22} />
                  <span className="text-sm font-medium text-fg">Journal</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-fg">
                  Every trade, with the reasoning.
                </h3>
                <p className="mt-2 text-pretty leading-relaxed text-fg-muted">
                  A calendar of wins and losses, a chart screenshot per trade,
                  and the bot’s own notes on why it acted.
                </p>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────────── How it works: vertical timeline ───────────────── */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-elevated/30">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">
              Three steps to a bot that trades for you.
            </h2>
          </Reveal>

          <ol className="mt-14 space-y-0">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 0.08}>
                <div className="relative flex gap-5 pb-12 last:pb-0">
                  {/* connector */}
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[1.6rem] top-14 h-[calc(100%-3.5rem)] w-px bg-gradient-to-b from-accent/50 to-line"
                    />
                  )}
                  <div className="relative z-10 flex h-13 w-13 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-line bg-surface text-accent">
                    <step.icon size={24} />
                  </div>
                  <div className="pt-1.5">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-sm text-accent">
                        0{i + 1}
                      </span>
                      <h3 className="text-xl font-semibold tracking-tight text-fg">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-2 max-w-lg text-pretty leading-relaxed text-fg-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────────── Risk-first guarantees ───────────────── */}
      <section className="scroll-mt-20">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8 lg:py-28">
          <Reveal>
            <Card className="relative overflow-hidden p-8 lg:p-12">
              <div
                aria-hidden
                className="glow-accent pointer-events-none absolute inset-0"
              />
              <div className="relative">
                <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-fg md:text-4xl">
                  Risk-first, by design.
                </h2>
                <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-fg-muted">
                  The bot makes money decisions inside limits it can never widen.
                  You stay in control of the things that matter.
                </p>
                <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
                  {GUARANTEES.map((g) => (
                    <div key={g.title}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
                        <g.icon size={20} />
                      </div>
                      <h3 className="mt-4 font-semibold text-fg">{g.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                        {g.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ───────────────── Pricing ───────────────── */}
      <section id="pricing" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 lg:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">
              Start on paper for free.
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-fg-muted">
              Trade simulated money until the numbers convince you. Upgrade when
              you go live.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 0.06}>
                <Card
                  className={`flex h-full flex-col p-6 ${
                    tier.featured ? "border-accent/60" : ""
                  }`}
                >
                  {tier.featured && (
                    <Badge tone="accent" className="mb-4 self-start">
                      Most popular
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold text-fg">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-semibold tracking-tight text-fg">
                      {tier.price}
                    </span>
                    <span className="text-sm text-fg-subtle">{tier.unit}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                    {tier.tagline}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          size={16}
                          weight="bold"
                          className="mt-0.5 shrink-0 text-accent"
                        />
                        <span className="text-fg-muted">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 pt-2">
                    <Button
                      href={authUrl("/sign-up")}
                      variant={tier.featured ? "primary" : "secondary"}
                      className="w-full"
                    >
                      Get started
                    </Button>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── Final CTA ───────────────── */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-24 text-center md:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-5xl">
              Hand over the screens.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-fg-muted">
              Spin up a paper account in minutes and watch the bot work.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href={authUrl("/sign-up")} size="lg">
                Get started
                <ArrowRight size={18} weight="bold" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ── Mini dashboard preview ──
   Real aggregates from the seeded demo account when available; a clearly
   labelled sample otherwise (so we never present fabricated numbers as live). */
const SAMPLE_SPARK = [
  10000, 10120, 10080, 10260, 10210, 10440, 10390, 10620, 10840,
];

function buildSparkPoints(values: number[], w = 320, h = 64, pad = 6): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function MiniDashboard({ demo }: { demo: DemoPreview | null }) {
  const live = demo !== null;
  const balance = demo ? formatUSD(demo.balance) : "$10,840.00";
  const changePct = demo?.changePct ?? 0.74;
  const up = changePct >= 0;
  const spark = demo && demo.spark.length >= 2 ? demo.spark : SAMPLE_SPARK;

  const metrics = [
    { label: "Win rate", value: demo ? `${demo.winRate.toFixed(1)}%` : "58.3%" },
    {
      label: "Profit factor",
      value: demo ? (demo.profitFactor != null ? demo.profitFactor.toFixed(2) : "∞") : "1.74",
    },
    { label: "Max drawdown", value: demo ? `${demo.maxDrawdownPct.toFixed(1)}%` : "6.2%" },
  ];

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-base/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
            Balance
            <span className="text-[0.6rem] uppercase tracking-wide text-fg-faint">
              {live ? "Live demo" : "Sample"}
            </span>
          </p>
          <p className="tnum mt-0.5 text-2xl font-semibold text-fg">{balance}</p>
        </div>
        <Badge tone={up ? "positive" : "negative"} mono>
          {up ? "+" : ""}
          {changePct.toFixed(2)}%
        </Badge>
      </div>
      <svg viewBox="0 0 320 64" className="mt-4 w-full" preserveAspectRatio="none">
        <polyline
          points={buildSparkPoints(spark)}
          fill="none"
          stroke="var(--color-profit)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-[0.7rem] text-fg-subtle">{m.label}</p>
            <p className="tnum mt-0.5 text-sm font-semibold text-fg">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: PlugsConnected,
    title: "Connect",
    body: "Link a paper or live broker account with API keys. Nothing trades until you say so.",
  },
  {
    icon: SlidersHorizontal,
    title: "Configure",
    body: "Pick a strategy and set your risk limits in the Strategy Lab. Plain inputs, safe bounds, no code.",
  },
  {
    icon: Robot,
    title: "Automate",
    body: "The bot trades the sessions you chose, posts every decision to the feed, and logs each trade in the journal.",
  },
] as const;

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: "Risk limits are yours",
    body: "Per-trade risk, daily loss cap, and trade caps are set by you. The bot can tune inside them, never widen them.",
  },
  {
    icon: HandPalm,
    title: "Emergency stop",
    body: "One click flattens every open position and halts the bot. Always visible, always one tap away.",
  },
  {
    icon: Camera,
    title: "Nothing is a black box",
    body: "Every entry and exit is screenshotted and narrated, so you can replay the bot's reasoning months later.",
  },
] as const;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    unit: "",
    tagline: "Paper trade and learn the platform.",
    featured: false,
    features: ["Paper trading", "1 account", "Full dashboard and journal"],
  },
  {
    name: "Trader",
    price: "$29",
    unit: "/mo",
    tagline: "Go live with real risk controls.",
    featured: true,
    features: [
      "Everything in Free",
      "Live trading",
      "Up to 3 accounts",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    price: "$79",
    unit: "/mo",
    tagline: "For multi-account and power users.",
    featured: false,
    features: [
      "Everything in Trader",
      "Unlimited accounts",
      "Backtesting and strategy marketplace",
      "API access",
    ],
  },
] as const;
