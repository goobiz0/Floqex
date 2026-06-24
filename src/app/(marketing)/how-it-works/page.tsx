import type { Metadata } from "next";
import {
  ArrowRight,
  ChartLineUp,
  Clock,
  ShieldCheck,
  Brain,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";
import { authUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The exact strategy, sessions, and risk rules the Floqex bot trades. No black box.",
};

export default function HowItWorksPage() {
  return (
    <div className="relative">
      {/* Intro */}
      <section className="relative mx-auto max-w-[1100px] px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <Reveal className="max-w-2xl">
          <h1 className="text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl lg:text-7xl">
            How the bot actually trades.
          </h1>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-fg-muted max-w-xl">
            Floqex runs one well-understood strategy with hard rules you can read in full. Here is
            the whole thing, start to finish.
          </p>
        </Reveal>
      </section>

      {/* The strategy */}
      <section className="relative mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <div className="flex items-center gap-2 text-accent">
              <ChartLineUp size={22} />
              <span className="text-sm font-medium text-fg">The strategy</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg">
              Opening Range Breakout
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
              At the start of a session the bot measures the high and low of the first fifteen
              minutes. That band is the opening range. When price closes above the high it goes long;
              when it closes below the low it goes short.
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <Card className="p-6">
              <ul className="divide-y divide-line">
                {ORB_RULES.map((r) => (
                  <li key={r.k} className="flex items-baseline justify-between gap-6 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm text-fg-muted">{r.k}</span>
                    <span className="text-right text-sm font-medium text-fg">{r.v}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Sessions */}
      <section className="relative border-y border-line bg-elevated/30">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-2 text-accent">
              <Clock size={22} />
              <span className="text-sm font-medium text-fg">The sessions</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg">
              Two windows, in market time.
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
              The bot only works during defined session windows and skips holidays. Daily loss and
              trade caps carry across both, so a rough Asia morning tightens the leash for New York.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            {SESSIONS.map((s) => (
              <Reveal key={s.name}>
                <Card className="h-full p-6">
                  <h3 className="font-semibold text-fg">{s.name}</h3>
                  <p className="mt-1 font-mono text-sm text-accent">{s.window}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <Row k="Instruments" v={s.instruments} />
                    <Row k="Opening range" v={s.range} />
                    <Row k="Skips" v={s.skips} />
                  </dl>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Risk controls */}
      <section className="relative mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <div className="flex items-center gap-2 text-accent">
            <ShieldCheck size={22} />
            <span className="text-sm font-medium text-fg">The guardrails</span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg">
            Limits the bot cannot widen.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
            You set these once. They are enforced on the server, so no strategy edit or self-tune
            can ever push past them.
          </p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {LIMITS.map((l) => (
            <Reveal key={l.title}>
              <div>
                <p className="font-mono text-2xl font-semibold tracking-tight text-fg">{l.value}</p>
                <h3 className="mt-2 text-sm font-semibold text-fg">{l.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{l.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Evidence loop */}
      <section className="relative border-t border-line">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <div className="flex items-center gap-2 text-accent">
                <Brain size={22} />
                <span className="text-sm font-medium text-fg">Bounded learning</span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg">
                It tunes itself, within reason.
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
                The bot tracks results by instrument, session, range size, and entry time. When the
                evidence is strong enough it adjusts three things only: the minimum range filter, the
                maximum range filter, and the entry cutoff time. It never touches your risk.
              </p>
              <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
                Each change needs a real sample, a gap since the last one, and a result beyond noise.
                The first fifteen adjustments happen automatically and are logged. After that, every
                proposal waits for your approval.
              </p>
            </Reveal>
            <Reveal delay={0.05} className="flex h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full w-full">
                {GATES.map((g, i) => (
                  <Card key={g} className="p-5 flex items-center justify-center text-center">
                    <span className="text-[13px] leading-relaxed text-fg-muted font-medium">{g}</span>
                  </Card>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">
              Watch it run on paper first.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-fg-muted">
              Spin up a simulated account and see every decision narrated in real time.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href={authUrl("/sign-up")} size="lg" className="rounded-[var(--radius-control)] h-12 px-6 text-[15px] font-semibold">
                Get started
                <ArrowRight size={18} weight="bold" className="ml-2" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg-subtle">{k}</dt>
      <dd className="text-right font-medium text-fg">{v}</dd>
    </div>
  );
}

const ORB_RULES = [
  { k: "Opening range", v: "First 15 minutes" },
  { k: "Long entry", v: "Close above range high" },
  { k: "Short entry", v: "Close below range low" },
  { k: "Stop", v: "Opposite side of range" },
  { k: "Target", v: "2x the risk" },
  { k: "Range health", v: "Skip if too quiet or too wild" },
  { k: "Re-entry", v: "Only after a pullback inside" },
] as const;

const SESSIONS = [
  {
    name: "Asia",
    window: "09:00 to 13:00 Tokyo",
    instruments: "Gold",
    range: "09:00 to 09:15",
    skips: "Japan and Australia holidays",
  },
  {
    name: "New York",
    window: "09:30 to 16:00 New York",
    instruments: "Gold, NQ, ES",
    range: "09:30 to 09:45",
    skips: "US holidays",
  },
] as const;

const LIMITS = [
  { value: "0.1 to 2%", title: "Risk per trade", body: "Sized from the stop distance. Hard ceiling of 2%." },
  { value: "1 to 5%", title: "Daily loss cap", body: "Hit it and trading halts for the day." },
  { value: "8 / day", title: "Trade caps", body: "Plus 4 per session and 2 open at once." },
  { value: "4 losses", title: "Instrument bench", body: "Four in a row benches it until a win." },
] as const;

const GATES = [
  "At least twenty trades in the category before a change is considered.",
  "At least five days since the last adjustment to the same setting.",
  "The measured effect has to sit clearly beyond random noise.",
  "Every step is bounded, logged, and reversible.",
] as const;
