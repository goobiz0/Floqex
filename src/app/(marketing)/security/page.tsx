import type { Metadata } from "next";
import {
  ArrowRight,
  LockKey,
  HandPalm,
  Eye,
  UsersThree,
  ShieldCheck,
  Database,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Floqex protects your credentials, isolates your data, and keeps risk controls unbreakable.",
};

export default function SecurityPage() {
  return (
    <div className="relative">
      <div aria-hidden className="aurora pointer-events-none absolute inset-x-0 top-0 h-[55vh] opacity-50" />

      <section className="relative mx-auto max-w-[1100px] px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-28">
        <Reveal className="max-w-2xl">
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
            Built so the risky parts cannot break.
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-fg-muted">
            Your money and your credentials deserve more than a promise. Here is how Floqex is put
            together, and the lines it will not cross.
          </p>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Reveal key={p.title}>
              <Card className="flex h-full flex-col p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
                  <p.icon size={20} />
                </div>
                <h2 className="mt-4 font-semibold text-fg">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{p.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-fg">What we never do.</h2>
              <p className="mt-4 text-pretty leading-relaxed text-fg-muted">
                Trust is mostly about restraint. These are commitments, not features that can be
                toggled.
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <ul className="divide-y divide-line">
                {NEVERS.map((n) => (
                  <li key={n} className="py-4 text-[0.95rem] leading-relaxed text-fg-muted first:pt-0 last:pb-0">
                    {n}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-[1100px] px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">
              Start where nothing is at stake.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-fg-muted">
              Paper trading needs no broker keys at all. Connect a live account only when you are
              ready.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/sign-up" size="lg">
                Get started
                <ArrowRight size={18} weight="bold" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

const PILLARS = [
  {
    icon: LockKey,
    title: "Credentials encrypted at rest",
    body: "Live broker API keys are encrypted before they are stored and decrypted only inside the trading engine to place orders. They are never sent back to your browser.",
  },
  {
    icon: ShieldCheck,
    title: "Risk enforced server-side",
    body: "Per-trade risk, the daily-loss breaker, and trade caps live on the server. No client request or strategy edit can widen them.",
  },
  {
    icon: UsersThree,
    title: "Your data stays yours",
    body: "Every query is scoped to your account, and live data channels are protected by ownership checks so one user can never read another's trades.",
  },
  {
    icon: HandPalm,
    title: "Emergency stop, always",
    body: "One control on every screen flattens open positions and halts the bot. It is the one button that always works.",
  },
  {
    icon: Eye,
    title: "Nothing is a black box",
    body: "Every entry and exit is screenshotted and narrated. You can replay exactly why the bot acted, months later.",
  },
  {
    icon: Database,
    title: "Trusted infrastructure",
    body: "Authentication runs on Clerk, billing on Stripe, the database on Supabase, and hosting on Vercel, each with its own security posture.",
  },
] as const;

const NEVERS = [
  "We never take custody of your funds. Floqex places orders; your broker holds the money.",
  "We never show a live API secret again after you enter it, and we never return it to the client.",
  "We never sell your personal data or use your trading activity to train models for others.",
  "We never let the bot raise the risk limits you set. It can tune inside them, nothing more.",
] as const;
