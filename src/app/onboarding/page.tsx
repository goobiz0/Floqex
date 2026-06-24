"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Key,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";
import { startCheckout } from "@/app/dashboard/billing/actions";
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/plans";

type Option = { id: string; label: string; sub?: string };

const REFERRAL: Option[] = [
  { id: "twitter", label: "X / Twitter", sub: "Seen on the timeline" },
  { id: "youtube", label: "YouTube", sub: "Watched a breakdown" },
  { id: "ai", label: "AI Search", sub: "ChatGPT, Claude, Perplexity" },
  { id: "social", label: "Other Social Media", sub: "Instagram, TikTok, LinkedIn" },
  { id: "search", label: "Search Engine", sub: "Google, Bing, etc." },
  { id: "friend", label: "Colleague / Friend", sub: "Personal recommendation" },
  { id: "other", label: "Something else", sub: "Type your response" },
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

const ASSETS: Option[] = [
  { id: "crypto", label: "Crypto", sub: "Bitcoin, Ethereum, Altcoins" },
  { id: "forex", label: "Forex", sub: "Major & minor currency pairs" },
  { id: "equities", label: "Stocks & Options", sub: "US Equities, Index Funds" },
  { id: "futures", label: "Futures", sub: "Indices, Commodities" },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

const STEPS = ["About you", "Experience", "Goal", "Assets", "Plan", "Account", "Activate"] as const;

const labelOf = (opts: Option[], id: string) => opts.find((o) => o.id === id)?.label ?? "—";

function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState(0);
  const [referral, setReferral] = useState<string | null>(null);
  const [customReferral, setCustomReferral] = useState("");
  const [experience, setExperience] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [asset, setAsset] = useState<string | null>(null);
  const [planSelection, setPlanSelection] = useState<Plan>("FREE");
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
  const [nickname, setNickname] = useState("Main account");
  const [discord, setDiscord] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ob_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.referral) setReferral(parsed.referral);
        if (parsed.customReferral) setCustomReferral(parsed.customReferral);
        if (parsed.experience) setExperience(parsed.experience);
        if (parsed.goal) setGoal(parsed.goal);
        if (parsed.asset) setAsset(parsed.asset);
        if (parsed.planSelection) setPlanSelection(parsed.planSelection);
        if (parsed.tz) setTz(parsed.tz);
        if (parsed.nickname) setNickname(parsed.nickname);
        
        // If returning from stripe checkout
        if (searchParams?.get("checkout") === "success") {
          setStep(5); // Advance to Account step
          // clear query param to avoid looping
          router.replace("/onboarding", { scroll: false });
        } else if (searchParams?.get("checkout") === "cancelled") {
          setStep(4); // Stay on Plan step
          setError("Checkout was cancelled. You can try again or select a Free plan.");
          router.replace("/onboarding", { scroll: false });
        } else if (parsed.step) {
          setStep(parsed.step);
        }
      }
    } catch {}
  }, [searchParams, router]);

  // Save state whenever it changes
  useEffect(() => {
    localStorage.setItem("ob_state", JSON.stringify({
      step, referral, customReferral, experience, goal, asset, planSelection, tz, nickname
    }));
  }, [step, referral, customReferral, experience, goal, asset, planSelection, tz, nickname]);

  const last = STEPS.length - 1;
  const isPaid = planSelection !== "FREE";

  const effectiveReferral = referral === "other" && customReferral ? customReferral : referral;

  const canContinue =
    (step === 0 && !!referral && (referral !== "other" || customReferral.trim().length > 0)) ||
    (step === 1 && !!experience) ||
    (step === 2 && !!goal) ||
    (step === 3 && !!asset) ||
    step === 4 || // Plan handled by click
    (step === 5 && nickname.trim().length > 0 && (!isPaid || (apiKey.trim().length > 0 && apiSecret.trim().length > 0))) ||
    step === 6;

  function advance() {
    setError(null);
    if (step === 4 && isPaid) {
      // Go to Stripe
      startTransition(async () => {
        const res = await startCheckout(planSelection, {
          success: "/onboarding?checkout=success",
          cancel: "/onboarding?checkout=cancelled"
        });
        if (res.ok && res.url) {
          window.location.href = res.url;
        } else {
          setError(res.error || "Could not start checkout.");
        }
      });
      return;
    }
    setStep(s => s + 1);
  }

  function activate() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        nickname,
        timezone: tz,
        referralSource: effectiveReferral ?? undefined,
        experience: experience ?? undefined,
        goal: goal ?? undefined,
        asset: asset ?? undefined,
        apiKey: isPaid ? apiKey : undefined,
        apiSecret: isPaid ? apiSecret : undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not finish setup. Please try again.");
        return;
      }
      localStorage.removeItem("ob_state");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-base text-fg font-sans selection:bg-accent/20 selection:text-accent-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/40 via-purple-100/20 to-transparent" />
      <div aria-hidden className="grid-faint pointer-events-none absolute inset-0 -z-10 opacity-20" />

      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6 shrink-0">
        <Wordmark />
        <span className="tnum text-[11px] font-bold text-fg-subtle uppercase tracking-widest">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="flex items-center gap-1.5 mt-2 shrink-0">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                i <= step ? "bg-accent shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-line/50"
              )}
            />
          ))}
        </div>

        <div className="mt-8 flex-1 flex flex-col justify-center pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-h-full"
            >
              {step === 0 && (
                <Step icon={Megaphone} title="How did you hear about us?" desc="No wrong answer. It helps us know where to show up next.">
                  <SelectGrid options={REFERRAL} value={referral} onSelect={(val) => setReferral(val)} columns={2} />
                  {referral === "other" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
                      <Input 
                        placeholder="Please specify..." 
                        value={customReferral}
                        onChange={(e) => setCustomReferral(e.target.value)}
                        className="bg-white"
                        autoFocus
                      />
                    </motion.div>
                  )}
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
                <Step icon={Wallet} title="Preferred asset class" desc="Which markets are you planning to deploy capital into?">
                  <SelectGrid options={ASSETS} value={asset} onSelect={(val) => setAsset(val)} columns={2} />
                </Step>
              )}

              {step === 4 && (
                <Step icon={Rocket} title="Choose your path" desc="Upgrade to trade live capital, or start with Paper trading for free.">
                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    {PLAN_ORDER.filter(p => p !== "FREE").map((planKey) => {
                      const plan = PLANS[planKey];
                      const selected = planSelection === planKey;
                      return (
                        <button
                          key={planKey}
                          type="button"
                          onClick={() => setPlanSelection(planKey)}
                          className={cn(
                            "group relative flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-all duration-300",
                            selected 
                              ? "border-accent bg-accent/5 shadow-[var(--shadow-sm)]" 
                              : "border-line bg-white hover:border-line-strong"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <h3 className={cn("font-bold text-sm", selected ? "text-accent" : "text-fg")}>{plan.name}</h3>
                            {plan.popular && <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Popular</span>}
                          </div>
                          <div className="mt-2 flex items-baseline gap-0.5">
                            <span className={cn("text-xl font-black tracking-tight", selected ? "text-accent" : "text-fg")}>${plan.price}</span>
                            <span className="text-[10px] font-medium text-fg-subtle">/mo</span>
                          </div>
                          <ul className="mt-3 flex flex-col gap-1.5 text-[11px] text-fg-subtle">
                            {plan.features.slice(0, 4).map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 leading-tight">
                                <Check size={12} className={cn("mt-[1px] shrink-0", selected ? "text-accent" : "text-fg-faint")} weight="bold" />
                                <span className={selected ? "text-fg" : "text-fg-subtle"}>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPlanSelection("FREE");
                        advance();
                      }}
                      className="text-[13px] font-semibold text-fg-subtle hover:text-fg underline underline-offset-4 transition-colors"
                    >
                      Continue for free
                    </button>
                  </div>
                </Step>
              )}

              {step === 5 && (
                <Step icon={Wallet} title={isPaid ? "Connect your exchange" : "Your paper account"} desc={isPaid ? "You are on a paid plan. Connect your broker API keys to trade live capital." : "A simulated account so you can watch the bot trade with real market data and zero risk."}>
                  <div className="space-y-4 mt-6">
                    <Field label="Account nickname" id="ob-nickname">
                      <div className="relative">
                        <Input
                          id="ob-nickname"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          maxLength={40}
                          className="pl-10 h-12 bg-white text-base shadow-[var(--shadow-sm)]"
                        />
                        <TextAa size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                      </div>
                    </Field>
                    
                    {isPaid && (
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="API Key" id="ob-apikey">
                          <Input
                            id="ob-apikey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Key"
                            className="bg-white"
                          />
                        </Field>
                        <Field label="API Secret" id="ob-apisecret">
                          <Input
                            id="ob-apisecret"
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            placeholder="Secret"
                            className="bg-white"
                          />
                        </Field>
                      </div>
                    )}

                    <Field label="Your timezone" id="ob-timezone">
                      <div className="relative">
                        <Clock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <select
                          id="ob-timezone"
                          value={tz}
                          onChange={(e) => setTz(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-line bg-white h-12 pl-10 pr-4 text-base text-fg focus-visible:border-accent focus-visible:outline-none transition-colors shadow-[var(--shadow-sm)]"
                        >
                          {TIMEZONES.map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </div>
                </Step>
              )}

              {step === 6 && (
                <Step icon={Check} title="Activate your bot" desc="It will watch the next session and trade your account automatically, inside its risk guardrails.">
                  <div className="rounded-2xl border border-line bg-white p-5 text-sm shadow-[var(--shadow-sm)] mt-6">
                    <Summary k="Found via" v={referral === "other" ? customReferral : labelOf(REFERRAL, referral ?? "")} />
                    <Summary k="Experience" v={labelOf(EXPERIENCE, experience ?? "")} />
                    <Summary k="Goal" v={labelOf(GOALS, goal ?? "")} />
                    <Summary k="Assets" v={labelOf(ASSETS, asset ?? "")} />
                    <Summary k="Plan" v={PLANS[planSelection].name} />
                    <Summary k="Account" v={`${nickname || "Main"} · ${isPaid ? "Live" : "Paper"}`} last />
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
            className="mb-4 rounded-xl bg-negative-soft p-3 text-sm font-medium text-negative border border-negative/20 text-center" 
          >
            {error}
          </motion.p>
        )}

        <div className="flex items-center justify-between border-t border-line py-6 shrink-0 mt-auto bg-[#FAFAFA]">
          {step > 0 ? (
            <Button variant="ghost" disabled={pending} onClick={() => setStep((s) => s - 1)} className="text-fg-subtle hover:text-fg px-0">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          ) : <span />}
          
          {step < last ? (
            <Button size="lg" disabled={!canContinue || pending} onClick={advance} className="bg-fg text-sm h-12 px-8 rounded-full shadow-md">
              {pending ? "Loading..." : step === 4 && isPaid ? "Continue to Payment" : "Continue"}
              {step !== 4 || !isPaid ? <ArrowRight size={16} weight="bold" className="ml-2" /> : null}
            </Button>
          ) : (
            <Button size="lg" disabled={pending} onClick={activate} className="bg-accent text-on-accent hover:bg-accent-hover shadow-lg shadow-accent/20 h-12 px-8 rounded-full">
              <Check size={16} weight="bold" className="mr-2" />
              {pending ? "Activating…" : "Activate and Start"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
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
    <div className="py-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20">
        <Icon size={24} weight="duotone" />
      </div>
      <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-pretty text-[15px] leading-relaxed text-fg-subtle">{desc}</p>
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
    <div className={cn("grid gap-2.5 mt-6", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(o.id)}
            className={cn(
              "group flex items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200",
              selected
                ? "border-accent bg-accent/5 shadow-[var(--shadow-sm)]"
                : "border-line hover:border-line-strong bg-white hover:bg-surface/50"
            )}
          >
            <span className="min-w-0">
              <span className={cn("block text-[15px] font-semibold transition-colors", selected ? "text-accent" : "text-fg")}>{o.label}</span>
              {o.sub && <span className={cn("mt-0.5 block text-[13px] transition-colors", selected ? "text-accent/80" : "text-fg-subtle")}>{o.sub}</span>}
            </span>
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                selected ? "border-accent bg-accent text-white scale-110" : "border-line group-hover:border-line-strong"
              )}
            >
              <AnimatePresence>
                {selected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check size={12} weight="bold" />
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
      <label htmlFor={id} className="text-[11px] font-bold text-fg-subtle tracking-widest uppercase">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-faint">{hint}</p>}
    </div>
  );
}

function Summary({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 py-3", !last && "border-b border-line/60")}>
      <span className="shrink-0 text-fg-subtle font-medium">{k}</span>
      <span className="truncate text-right font-semibold text-fg">{v}</span>
    </div>
  );
}
