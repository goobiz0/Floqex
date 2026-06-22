"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Wallet,
  ChatCircleDots,
  Rocket,
  Megaphone,
  ChartLineUp,
  Target,
  TextAa,
  DiscordLogo,
  type Icon,
} from "@phosphor-icons/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";

type Option = { id: string; label: string; sub?: string };

const REFERRAL: Option[] = [
  { id: "twitter", label: "X / Twitter" },
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
  { id: "friend", label: "Friend or colleague" },
  { id: "search", label: "Search engine" },
  { id: "other", label: "Somewhere else" },
];

const EXPERIENCE: Option[] = [
  { id: "new", label: "New to trading", sub: "Just getting started" },
  { id: "some", label: "Some experience", sub: "A few months in" },
  { id: "experienced", label: "Experienced", sub: "Years of screen time" },
  { id: "algo", label: "Algo / quant", sub: "I automate already" },
];

const GOALS: Option[] = [
  { id: "learn", label: "Learn by watching", sub: "See how a disciplined bot trades" },
  { id: "grow", label: "Grow a small account", sub: "Compound steadily with guardrails" },
  { id: "automate", label: "Automate my edge", sub: "Run my own rules hands-free" },
  { id: "handsoff", label: "Hands-off investing", sub: "Set it and check in sometimes" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const STEPS = ["About you", "Experience", "Goal", "Account", "Alerts", "Activate"] as const;

const labelOf = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.label ?? "—";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [referral, setReferral] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [tz, setTz] = useState("America/New_York");
  const [nickname, setNickname] = useState("Main account");
  const [discord, setDiscord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const last = STEPS.length - 1;

  // Each gated step needs a selection before the user can advance.
  const canContinue =
    (step === 0 && !!referral) ||
    (step === 1 && !!experience) ||
    (step === 2 && !!goal) ||
    (step === 3 && nickname.trim().length > 0) ||
    step === 4 ||
    step === 5;

  function activate() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        nickname,
        timezone: tz,
        discordWebhookUrl: discord,
        referralSource: referral ?? undefined,
        experience: experience ?? undefined,
        goal: goal ?? undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not finish setup. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div aria-hidden className="aurora pointer-events-none absolute inset-0 -z-10 opacity-60" />

      <header className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-6">
        <Wordmark />
        <span className="tnum text-xs text-fg-subtle">
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
                "h-1 flex-1 rounded-full transition-colors duration-300",
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
                <Step icon={Megaphone} title="How did you hear about us?" desc="No wrong answer. It helps us know where to show up next.">
                  <SelectGrid options={REFERRAL} value={referral} onSelect={setReferral} columns={2} />
                </Step>
              )}

              {step === 1 && (
                <Step icon={ChartLineUp} title="How would you describe your trading?" desc="We tune the guidance and defaults to match where you are.">
                  <SelectGrid options={EXPERIENCE} value={experience} onSelect={setExperience} columns={2} />
                </Step>
              )}

              {step === 2 && (
                <Step icon={Target} title="What brings you to Floqex?" desc="Pick the one that fits best. You can change direction any time.">
                  <SelectGrid options={GOALS} value={goal} onSelect={setGoal} columns={1} />
                </Step>
              )}

              {step === 3 && (
                <Step icon={Wallet} title="Your paper account is ready" desc="A simulated account so you can watch the bot trade with real market data and zero risk.">
                  <div className="space-y-4">
                    <Field label="Account nickname" id="ob-nickname">
                      <Input
                        id="ob-nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        maxLength={40}
                        icon={<TextAa />}
                      />
                    </Field>
                    <Field label="Your timezone" id="ob-timezone" hint="Session times show in your local clock alongside the market's.">
                      <div className="relative">
                        <Clock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <select
                          id="ob-timezone"
                          value={tz}
                          onChange={(e) => setTz(e.target.value)}
                          className="w-full appearance-none rounded-[var(--radius-control)] border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
                        >
                          {TIMEZONES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-base/40 px-4 py-3 text-sm">
                      <span className="text-fg-subtle">Starting balance</span>
                      <span className="tnum font-medium text-fg">$10,000.00</span>
                    </div>
                  </div>
                </Step>
              )}

              {step === 4 && (
                <Step icon={ChatCircleDots} title="Get the decision feed on Discord" desc="Optional. Paste a webhook to receive the bot's narration and milestone alerts.">
                  <Field label="Discord webhook" id="ob-discord" hint="Server Settings, then Integrations, then Webhooks, then Copy URL.">
                    <Input
                      id="ob-discord"
                      type="url"
                      value={discord}
                      onChange={(e) => setDiscord(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      icon={<DiscordLogo weight="fill" />}
                    />
                  </Field>
                </Step>
              )}

              {step === 5 && (
                <Step icon={Rocket} title="Activate your bot" desc="It will watch the next session and trade your paper account automatically, inside its risk guardrails.">
                  <div className="rounded-[var(--radius-control)] border border-line bg-base/40 p-4 text-sm">
                    <Summary k="How you found us" v={labelOf(REFERRAL, referral ?? "")} />
                    <Summary k="Experience" v={labelOf(EXPERIENCE, experience ?? "")} />
                    <Summary k="Goal" v={labelOf(GOALS, goal ?? "")} />
                    <Summary k="Timezone" v={tz.replace(/_/g, " ")} />
                    <Summary k="Account" v={`${nickname || "Main account"} · Paper`} />
                    <Summary k="Discord" v={discord ? "Connected" : "Skipped"} last />
                  </div>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <p className="mt-6 text-sm text-negative" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={16} />
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < last ? (
            <Button size="sm" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              Continue
              <ArrowRight size={16} weight="bold" />
            </Button>
          ) : (
            <Button size="sm" disabled={pending} onClick={activate}>
              <Check size={16} weight="bold" />
              {pending ? "Activating…" : "Activate and go to dashboard"}
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
  icon: Icon;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-accent-soft text-accent">
        <Icon size={24} />
      </div>
      <h1 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-pretty leading-relaxed text-fg-muted">{desc}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SelectGrid({
  options,
  value,
  onSelect,
  columns,
}: {
  options: Option[];
  value: string | null;
  onSelect: (id: string) => void;
  columns: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-2.5", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(o.id)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-[var(--radius-control)] border px-4 py-3 text-left transition-colors",
              selected
                ? "border-accent bg-accent-soft"
                : "border-line hover:border-line-strong hover:bg-surface/60",
            )}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">{o.label}</span>
              {o.sub && <span className="mt-0.5 block text-xs text-fg-subtle">{o.sub}</span>}
            </span>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                selected ? "border-accent bg-accent text-[var(--color-on-accent)]" : "border-line",
              )}
            >
              {selected && <Check size={12} weight="bold" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  hint,
  id,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{hint}</p>}
    </div>
  );
}

function Summary({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-2", !last && "border-b border-line")}>
      <span className="shrink-0 text-fg-subtle">{k}</span>
      <span className="truncate text-right font-medium text-fg">{v}</span>
    </div>
  );
}
