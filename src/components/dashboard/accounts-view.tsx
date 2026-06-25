"use client";

import { useId, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  Wallet,
  Info,
  Copy,
  Key,
  Lock,
  TextAa,
  DotsThree,
} from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { DisplayValue } from "@/components/ui/display-value";
import { cn } from "@/lib/utils";
import { connectAccount, toggleBotStatus, disconnectAccount } from "@/app/dashboard/accounts/actions";
import { PLANS, type Plan, type PlanConfig } from "@/lib/plans";
import type { Broker } from "@prisma/client";
import Link from "next/link";
import { dashboardUrl } from "@/lib/urls";
import type { ReactNode } from "react";

type Acct = {
  id: string;
  nickname: string;
  broker: string;
  mode: string;
  balance: number | string;
  bot?: { status: string } | null;
};

const BROKERS = [
  { id: "PAPER", name: "Paper", note: "Simulated money, no broker needed" },
  { id: "OANDA", name: "OANDA", note: "Forex and gold" },
  { id: "IBKR", name: "Interactive Brokers", note: "Futures and equities" },
  { id: "TRADOVATE", name: "Tradovate", note: "Futures" },
  { id: "ALPACA", name: "Alpaca", note: "US equities and crypto" },
];

export function AccountsView({ initialAccounts = [], plan = "FREE" }: { initialAccounts?: Acct[], plan?: string }) {
  const [connecting, setConnecting] = useState(false);
  const [pending, startTransition] = useTransition();

  const activePlan = PLANS[plan as Plan] || PLANS.FREE;
  const hitLimit = initialAccounts.length >= activePlan.accountLimit;

  function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleBotStatus(id);
      if (!res.ok) {
        alert(res.error);
      }
    });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    alert("Webhook URL copied to clipboard!");
  }

  function handleDisconnect(id: string) {
    if (confirm("Are you sure you want to disconnect this account? All associated bots and trading history will be permanently deleted.")) {
      startTransition(async () => {
        const res = await disconnectAccount(id);
        if (!res.ok) {
          alert(res.error);
        }
      });
    }
  }

  return (
    <div className="space-y-4">
      {!connecting ? (
        <>
          <div className="flex items-center justify-between">
            <CardTitle>Connected accounts ({initialAccounts.length}/{activePlan.accountLimit === Number.POSITIVE_INFINITY ? '∞' : activePlan.accountLimit})</CardTitle>
            <Button size="sm" onClick={() => setConnecting(true)}>
              <Plus size={16} weight="bold" />
              Connect account
            </Button>
          </div>

          {hitLimit && (
            <div className="rounded-[var(--radius-card)] border border-accent/20 bg-accent-soft/30 p-4 flex items-start gap-3 text-sm text-fg">
               <Info size={18} className="text-accent mt-0.5" weight="fill" />
               <div>
                  <p className="font-medium">Account limit reached</p>
                  <p className="text-fg-muted mt-1">Your current {activePlan.name} plan is limited to {activePlan.accountLimit} account(s). Upgrade to connect more brokers and run multiple bots simultaneously.</p>
                  <Link href={dashboardUrl("/settings")} className="font-medium text-accent hover:text-accent-hover mt-2 inline-block">View plans</Link>
               </div>
            </div>
          )}

          {initialAccounts.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-line rounded-[var(--radius-card)]">
               <Wallet size={32} className="text-fg-faint mb-4" />
               <p className="text-sm font-medium text-fg">No accounts connected</p>
               <p className="text-xs text-fg-subtle mt-1 mb-4">Connect a paper or live account to start your bot.</p>
               <Button size="sm" onClick={() => setConnecting(true)}>Connect an account</Button>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {initialAccounts.map((a) => {
                const botStatus = a.bot?.status || "STOPPED";
                const isRunning = botStatus === "RUNNING";
                
                return (
                  <Card key={a.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-accent">
                          <Wallet size={20} />
                        </span>
                        <div>
                          <p className="font-medium text-fg">{a.nickname}</p>
                          <p className="text-xs text-fg-subtle">{a.broker}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={a.mode === "LIVE" ? "warning" : "neutral"}>
                          {a.mode === "LIVE" ? "Live" : "Paper"}
                        </Badge>
                        <Dropdown 
                          align="right"
                          trigger={
                            <button className="flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface hover:text-fg">
                              <DotsThree size={20} weight="bold" />
                            </button>
                          }
                          items={[
                            { label: "Disconnect", onClick: () => handleDisconnect(a.id) }
                          ]}
                        />
                      </div>
                    </div>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-fg-subtle">Balance</p>
                        <p className="tnum mt-0.5 text-xl font-semibold text-fg">
                          <DisplayValue type="BALANCE" money={Number(a.balance)} />
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                           <StatusDot tone={isRunning ? "positive" : botStatus === "WAITING" ? "warning" : "neutral"} pulse={isRunning} />
                           {isRunning ? "Bot running" : botStatus === "WAITING" ? "Bot waiting" : "Bot stopped"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-fg-subtle uppercase tracking-wider">
                            Engine {isRunning ? "ON" : "OFF"}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            disabled={pending}
                            aria-checked={isRunning}
                            onClick={() => handleToggle(a.id)}
                            className={cn(
                              "relative h-6 w-11 shrink-0 rounded-full ring-1 ring-inset outline-none transition-colors duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                              isRunning ? "bg-accent ring-accent/60" : "bg-surface ring-line-strong",
                              pending && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform duration-150 ease-[var(--ease-out)]",
                                isRunning ? "translate-x-5" : "translate-x-0",
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    {activePlan.id === "PRO" && (
                      <div className="mt-4 border-t border-line pt-4">
                        <p className="text-xs font-medium text-fg-subtle mb-1">TradingView Webhook URL</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] bg-surface px-2 py-1.5 text-[11px] text-fg-muted border border-line">
                            {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/tradingview/{a.id}
                          </code>
                          <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => handleCopy(`${window.location.origin}/api/webhooks/tradingview/${a.id}`)}>
                            <Copy size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <ConnectFlow planConfig={activePlan} onCancel={() => setConnecting(false)} onComplete={() => setConnecting(false)} />
      )}
    </div>
  );
}

function ConnectFlow({
  planConfig,
  onCancel,
  onComplete,
}: {
  planConfig: PlanConfig;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [broker, setBroker] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPaper = broker === "PAPER";
  const brokerMeta = BROKERS.find((b) => b.id === broker);

  async function submit() {
    setError(null);
    startTransition(async () => {
      const res = await connectAccount({
        nickname: nickname || "Main account",
        broker: (broker ?? "PAPER") as Broker,
        mode: isPaper ? "PAPER" : "LIVE",
        apiKey: isPaper ? undefined : apiKey,
        apiSecret: isPaper ? undefined : apiSecret,
      });
      if (res.ok) {
        onComplete();
      } else {
        setError(res.error || "Failed to connect account.");
      }
    });
  }

  function next() {
    setError(null);
    if (step === 0 && !isPaper && !planConfig.liveTrading) {
       setError("Your current plan does not support Live trading brokers. Please upgrade.");
       return;
    }
    setStep(s => s + 1);
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              s <= step ? "bg-accent" : "bg-surface",
            )}
          />
        ))}
      </div>

      <div className="mt-6 min-h-[220px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <h2 className="text-lg font-semibold text-fg">Choose a broker</h2>
              <p className="mt-1 text-sm text-fg-muted">Start on paper if you want to try the bot first.</p>
              {error && <p className="mt-3 text-sm text-negative bg-negative-soft p-2 rounded-[var(--radius-control)]">{error}</p>}
              <div className="mt-4 grid gap-2">
                {BROKERS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setBroker(b.id); setError(null); }}
                    className={cn(
                      "flex items-center justify-between rounded-[var(--radius-control)] border px-4 py-3 text-left transition-colors",
                      broker === b.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-fg">{b.name}</p>
                      <p className="text-xs text-fg-subtle">{b.note}</p>
                    </div>
                    {broker === b.id && <Check size={18} weight="bold" className="text-accent" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <h2 className="text-lg font-semibold text-fg">
                {isPaper ? "Name your paper account" : `Connect ${brokerMeta?.name}`}
              </h2>
              {error && <p className="mt-3 text-sm text-negative bg-negative-soft p-2 rounded-[var(--radius-control)]">{error}</p>}
              <div className="mt-4 space-y-4">
                <Field label="Account nickname" value={nickname} onChange={setNickname} placeholder="Main account" icon={<TextAa />} />
                {!isPaper && (
                  <>
                    <Field label="API key" value={apiKey} onChange={setApiKey} placeholder="Your broker API key" icon={<Key />} />
                    <Field label="API secret" value={apiSecret} onChange={setApiSecret} placeholder="Your broker API secret" type="password" icon={<Lock />} />
                  </>
                )}
                {!isPaper && (
                  <p className="text-xs text-fg-subtle">
                    Keys are encrypted at rest. Nothing trades until you activate the bot.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <h2 className="text-lg font-semibold text-fg">Review</h2>
              {error && <p className="mt-3 text-sm text-negative bg-negative-soft p-2 rounded-[var(--radius-control)] mb-2">{error}</p>}
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Broker" v={brokerMeta?.name ?? ""} />
                <Row k="Nickname" v={nickname || "Main account"} />
                <Row k="Mode" v={isPaper ? "Paper" : "Live"} />
                {isPaper && <Row k="Starting balance" v="$10,000.00" />}
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
        >
          <ArrowLeft size={16} />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 ? (
          <Button size="sm" disabled={step === 0 && !broker} onClick={next}>
            Continue
            <ArrowRight size={16} weight="bold" />
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "Connecting..." : <><Check size={16} weight="bold" /> Connect</>}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        icon={icon}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-2">
      <dt className="text-fg-subtle">{k}</dt>
      <dd className="font-medium text-fg">{v}</dd>
    </div>
  );
}
