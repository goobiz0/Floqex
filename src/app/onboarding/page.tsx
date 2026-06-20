"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Wallet,
  Flask,
  ChatCircleDots,
  Robot,
} from "@phosphor-icons/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const STEPS = ["Timezone", "Paper account", "Strategy", "Alerts", "Activate"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tz, setTz] = useState("America/New_York");
  const [nickname, setNickname] = useState("Main account");
  const [discord, setDiscord] = useState("");

  const last = STEPS.length - 1;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-6">
        <Wordmark />
        <span className="text-xs text-fg-subtle">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-12">
        {/* progress */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-200",
                i <= step ? "bg-accent" : "bg-surface",
              )}
            />
          ))}
        </div>

        <div className="mt-10 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {step === 0 && (
                <Step icon={Clock} title="What timezone are you in?" desc="Session times are shown in your local time alongside the market's.">
                  <label className="text-sm font-medium text-fg">Timezone</label>
                  <select
                    value={tz}
                    onChange={(e) => setTz(e.target.value)}
                    className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
                  >
                    {TIMEZONES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </Step>
              )}

              {step === 1 && (
                <Step icon={Wallet} title="Your paper account is ready" desc="We created a simulated account so you can watch the bot trade with no risk.">
                  <label className="text-sm font-medium text-fg">Account nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
                  />
                  <div className="mt-4 flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-base/40 px-4 py-3 text-sm">
                    <span className="text-fg-subtle">Starting balance</span>
                    <span className="tnum font-medium text-fg">$10,000.00</span>
                  </div>
                </Step>
              )}

              {step === 2 && (
                <Step icon={Flask} title="Start with the ORB strategy" desc="Opening Range Breakout, pre-configured with safe defaults. You can tune it any time in the Strategy Lab.">
                  <div className="rounded-[var(--radius-control)] border border-accent/50 bg-accent-soft p-4">
                    <p className="font-medium text-fg">Opening Range Breakout</p>
                    <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                      <li>15-minute opening range, 2R target</li>
                      <li>1% risk per trade, 3% daily loss cap</li>
                      <li>Gold, NQ, and ES across two sessions</li>
                    </ul>
                  </div>
                </Step>
              )}

              {step === 3 && (
                <Step icon={ChatCircleDots} title="Get the decision feed on Discord" desc="Optional. Paste a webhook to receive the bot's narration and milestone alerts.">
                  <label className="text-sm font-medium text-fg">Discord webhook (optional)</label>
                  <input
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-fg-faint focus-visible:border-accent focus-visible:outline-none"
                  />
                </Step>
              )}

              {step === 4 && (
                <Step icon={Robot} title="Activate the bot" desc="The bot will start watching the next session and trade your paper account automatically.">
                  <div className="rounded-[var(--radius-control)] border border-line bg-base/40 p-4 text-sm">
                    <Summary k="Timezone" v={tz.replace("_", " ")} />
                    <Summary k="Account" v={`${nickname} · Paper`} />
                    <Summary k="Strategy" v="Opening Range Breakout" />
                    <Summary k="Discord" v={discord ? "Connected" : "Skipped"} last />
                  </div>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 0 ? router.push("/dashboard") : setStep((s) => s - 1))}
          >
            <ArrowLeft size={16} />
            {step === 0 ? "Skip" : "Back"}
          </Button>
          {step < last ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Continue
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => router.push("/dashboard")}>
              <Check size={16} weight="bold" />
              Activate and go to dashboard
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Clock;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent">
        <Icon size={24} />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-pretty leading-relaxed text-fg-muted">{desc}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Summary({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={cn("flex justify-between py-2", !last && "border-b border-line")}>
      <span className="text-fg-subtle">{k}</span>
      <span className="font-medium text-fg">{v}</span>
    </div>
  );
}
