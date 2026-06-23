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
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/plans";

type Option = { id: string; label: string; sub?: string };

const REFERRAL: Option[] = [
  { id: "twitter", label: "X / Twitter", sub: "Seen on the timeline" },
  { id: "youtube", label: "YouTube", sub: "Watched a breakdown" },
  { id: "reddit", label: "Reddit", sub: "In the trenches" },
  { id: "friend", label: "Colleague", sub: "Personal recommendation" },
  { id: "search", label: "Search engine", sub: "Googling for an edge" },
  { id: "other", label: "Somewhere else", sub: "The ether" },
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
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const STEPS = ["About you", "Experience", "Goal", "Plan", "Account", "Alerts", "Activate"] as const;

const labelOf = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.label ?? "—";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [referral, setReferral] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [planSelection, setPlanSelection] = useState<Plan>("FREE");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
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
    step === 3 || // Plan selection is made via click directly
    (step === 4 && nickname.trim().length > 0) ||
    step === 5 ||
    step === 6;

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
      if (planSelection !== "FREE") {
        router.push("/dashboard/billing");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    });
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#FAFAFA] text-slate-900 font-sans selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Light Emerald to Light Purple gradient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-purple-100/30 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent" />
      <div aria-hidden className="grid-faint pointer-events-none absolute inset-0 -z-10 opacity-20" />

      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-8">
        <Wordmark />
        <div className="flex items-center gap-3">
          <span className="tnum text-xs font-medium text-fg-subtle uppercase tracking-widest">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-20">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mt-4">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                i <= step ? "bg-accent shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-surface"
              )}
            />
          ))}
        </div>

        <div className="mt-16 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
            >
              {step === 0 && (
                <Step icon={Megaphone} title="How did you hear about us?" desc="No wrong answer. It helps us know where to show up next.">
                  <SelectGrid options={REFERRAL} value={referral} onSelect={(val) => setReferral(val)} columns={2} />
                </Step>
              )}

              {step === 1 && (
                <Step icon={ChartLineUp} title="How would you describe your trading?" desc="We tune the guidance and defaults to match where you are.">
                  <SelectGrid options={EXPERIENCE} value={experience} onSelect={(val) => setExperience(val)} columns={2} />
                </Step>
              )}

              {step === 2 && (
                <Step icon={Target} title="What brings you to Floqex?" desc="Pick the one that fits best. You can change direction any time.">
                  <SelectGrid options={GOALS} value={goal} onSelect={(val) => setGoal(val)} columns={1} />
                </Step>
              )}

              {step === 3 && (
                <Step icon={Rocket} title="Choose your path" desc="Upgrade to trade live capital, or start with Paper trading for free.">
                  <div className="grid gap-4 sm:grid-cols-3 mt-8">
                    {PLAN_ORDER.map((planKey) => {
                      const plan = PLANS[planKey];
                      const selected = planSelection === planKey;
                      return (
                        <button
                          key={planKey}
                          type="button"
                          onClick={() => setPlanSelection(planKey)}
                          className={cn(
                            "group relative flex flex-col items-start rounded-[var(--radius-card)] border-2 p-5 text-left transition-all duration-300",
                            selected 
                              ? "border-accent bg-accent-soft/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02]" 
                              : "border-line bg-surface hover:border-line-strong hover:bg-surface/80"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <h3 className={cn("font-semibold", selected ? "text-accent" : "text-fg")}>{plan.name}</h3>
                            {plan.popular && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-on-accent shadow-[0_0_10px_rgba(16,185,129,0.4)]">Popular</span>}
                          </div>
                          <p className="mt-2 text-[12px] leading-relaxed text-fg-subtle min-h-[36px]">
                            {plan.tagline}
                          </p>
                          <div className="mt-4 flex w-full flex-col pt-4 border-t border-line/50">
                            <div className="flex items-baseline gap-1">
                              <span className={cn("text-3xl font-bold tracking-tight", selected ? "text-accent" : "text-fg")}>${plan.price}</span>
                              <span className="text-[11px] font-medium text-fg-subtle">/mo</span>
                            </div>
                            <ul className="mt-4 flex flex-col gap-2.5 text-[12px] text-fg-subtle">
                              {plan.features.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Check size={14} className={cn("mt-0.5 shrink-0 transition-colors", selected ? "text-accent" : "text-fg-faint")} weight="bold" />
                                  <span className={selected ? "text-fg" : "text-fg-subtle"}>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Step>
              )}

              {step === 4 && (
                <Step icon={Wallet} title="Your paper account is ready" desc="A simulated account so you can watch the bot trade with real market data and zero risk.">
                  <div className="space-y-6 mt-8">
                    <Field label="Account nickname" id="ob-nickname">
                      <div className="relative">
                        <Input
                          id="ob-nickname"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          maxLength={40}
                          className="pl-10 h-12 bg-surface text-base"
                        />
                        <TextAa size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                      </div>
                    </Field>
                    <Field label="Your timezone" id="ob-timezone" hint="Session times show in your local clock alongside the market's.">
                      <div className="relative">
                        <Clock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <select
                          id="ob-timezone"
                          value={tz}
                          onChange={(e) => setTz(e.target.value)}
                          className="w-full appearance-none rounded-[var(--radius-control)] border border-line bg-surface h-12 pl-10 pr-4 text-base text-fg focus-visible:border-accent focus-visible:outline-none transition-colors"
                        >
                          {TIMEZONES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-surface/50 px-5 py-4 text-sm mt-4">
                      <span className="text-fg-subtle font-medium">Starting paper balance</span>
                      <span className="tnum text-lg font-bold text-accent">$10,000.00</span>
                    </div>
                  </div>
                </Step>
              )}

              {step === 5 && (
                <Step icon={ChatCircleDots} title="Get the decision feed on Discord" desc="Optional. Paste a webhook to receive the bot's narration and milestone alerts directly to your server.">
                  <div className="mt-8">
                    <Field label="Discord webhook URL" id="ob-discord" hint="Server Settings → Integrations → Webhooks → Copy URL">
                      <div className="relative">
                        <Input
                          id="ob-discord"
                          type="url"
                          value={discord}
                          onChange={(e) => setDiscord(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="pl-10 h-12 bg-surface text-base placeholder:text-fg-faint"
                        />
                        <DiscordLogo weight="fill" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5865F2]" />
                      </div>
                    </Field>
                  </div>
                </Step>
              )}

              {step === 6 && (
                <Step icon={Check} title="Activate your bot" desc="It will watch the next session and trade your paper account automatically, inside its risk guardrails.">
                  <div className="rounded-[var(--radius-card)] border border-line bg-surface/60 p-6 text-sm backdrop-blur-md mt-8 shadow-sm">
                    <Summary k="How you found us" v={labelOf(REFERRAL, referral ?? "")} />
                    <Summary k="Experience" v={labelOf(EXPERIENCE, experience ?? "")} />
                    <Summary k="Goal" v={labelOf(GOALS, goal ?? "")} />
                    <Summary k="Plan Selected" v={PLANS[planSelection].name} />
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
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-[var(--radius-control)] bg-negative-soft p-4 text-sm font-medium text-negative border border-negative/20 text-center shadow-sm" 
            role="alert"
          >
            {error}
          </motion.p>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
          {step > 0 ? (
            <Button variant="ghost" size="lg" disabled={pending} onClick={() => setStep((s) => s - 1)} className="text-fg-subtle hover:text-fg">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          ) : (
            <span />
          )}
          
          {step < last ? (
            <Button size="lg" disabled={!canContinue} onClick={() => setStep((s) => s + 1)} className="bg-fg text-base hover:bg-fg/90">
              Continue
              <ArrowRight size={18} weight="bold" className="ml-2" />
            </Button>
          ) : (
            <Button size="lg" disabled={pending} onClick={activate} className="bg-accent text-on-accent hover:bg-accent-hover shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Check size={18} weight="bold" className="mr-2" />
              {pending ? "Activating…" : planSelection !== "FREE" ? "Activate and Upgrade" : "Activate and Start"}
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent border border-accent/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <Icon size={28} weight="duotone" />
      </div>
      <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-fg">{title}</h1>
      <p className="mt-3 text-pretty text-lg leading-relaxed text-fg-muted max-w-lg">{desc}</p>
      <div className="mt-2">{children}</div>
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
    <div className={cn("grid gap-3 mt-8", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(o.id)}
            className={cn(
              "group flex items-center justify-between gap-4 rounded-[var(--radius-card)] border-2 px-5 py-4 text-left transition-all duration-200",
              selected
                ? "border-accent bg-accent-soft/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                : "border-line hover:border-line-strong hover:bg-surface/50"
            )}
          >
            <span className="min-w-0">
              <span className={cn("block text-base font-semibold transition-colors", selected ? "text-accent" : "text-fg")}>{o.label}</span>
              {o.sub && <span className={cn("mt-1 block text-sm transition-colors", selected ? "text-accent/80" : "text-fg-subtle")}>{o.sub}</span>}
            </span>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                selected ? "border-accent bg-accent text-on-accent scale-110" : "border-line group-hover:border-line-strong"
              )}
            >
              <AnimatePresence>
                {selected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check size={14} weight="bold" />
                  </motion.div>
                )}
              </AnimatePresence>
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
      <label htmlFor={id} className="text-sm font-semibold text-fg tracking-wide uppercase">
        {label}
      </label>
      <div className="mt-2.5">{children}</div>
      {hint && <p className="mt-2.5 text-xs leading-relaxed text-fg-subtle">{hint}</p>}
    </div>
  );
}

function Summary({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-3.5", !last && "border-b border-line/60")}>
      <span className="shrink-0 text-fg-subtle font-medium">{k}</span>
      <span className="truncate text-right font-semibold text-fg">{v}</span>
    </div>
  );
}
