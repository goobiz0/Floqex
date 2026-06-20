"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, ArrowLeft, ArrowRight, Check, Wallet } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatUSD } from "@/lib/utils";

type Acct = {
  id: string;
  nickname: string;
  broker: string;
  mode: "PAPER" | "LIVE";
  balance: number;
  active: boolean;
};

const BROKERS = [
  { id: "PAPER", name: "Paper", note: "Simulated money, no broker needed" },
  { id: "OANDA", name: "OANDA", note: "Forex and gold" },
  { id: "IBKR", name: "Interactive Brokers", note: "Futures and equities" },
  { id: "TRADOVATE", name: "Tradovate", note: "Futures" },
  { id: "ALPACA", name: "Alpaca", note: "US equities and crypto" },
];

export function AccountsView() {
  const [accounts, setAccounts] = useState<Acct[]>([
    { id: "a1", nickname: "Main account", broker: "Paper", mode: "PAPER", balance: 12847.2, active: true },
  ]);
  const [connecting, setConnecting] = useState(false);

  function toggle(id: string) {
    setAccounts((a) => a.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  }

  function add(acct: Acct) {
    setAccounts((a) => [acct, ...a]);
    setConnecting(false);
  }

  return (
    <div className="space-y-4">
      {!connecting ? (
        <>
          <div className="flex items-center justify-between">
            <CardTitle>Connected accounts</CardTitle>
            <Button size="sm" onClick={() => setConnecting(true)}>
              <Plus size={16} weight="bold" />
              Connect account
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accounts.map((a) => (
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
                  <Badge tone={a.mode === "LIVE" ? "warning" : "neutral"}>
                    {a.mode === "LIVE" ? "Live" : "Paper"}
                  </Badge>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-fg-subtle">Balance</p>
                    <p className="tnum mt-0.5 text-xl font-semibold text-fg">
                      {formatUSD(a.balance)}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.active}
                    onClick={() => toggle(a.id)}
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 ease-[var(--ease-out)]",
                      a.active ? "bg-accent" : "bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-fg transition-transform duration-150 ease-[var(--ease-out)]",
                        a.active ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <ConnectFlow onCancel={() => setConnecting(false)} onConnect={add} />
      )}
    </div>
  );
}

function ConnectFlow({
  onCancel,
  onConnect,
}: {
  onCancel: () => void;
  onConnect: (a: Acct) => void;
}) {
  const [step, setStep] = useState(0);
  const [broker, setBroker] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const isPaper = broker === "PAPER";

  const brokerMeta = BROKERS.find((b) => b.id === broker);

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
              <div className="mt-4 grid gap-2">
                {BROKERS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBroker(b.id)}
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
              <div className="mt-4 space-y-4">
                <Field label="Account nickname" value={nickname} onChange={setNickname} placeholder="Main account" />
                {!isPaper && (
                  <>
                    <Field label="API key" placeholder="Your broker API key" />
                    <Field label="API secret" placeholder="Your broker API secret" type="password" />
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
          onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
        >
          <ArrowLeft size={16} />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 ? (
          <Button size="sm" disabled={step === 0 && !broker} onClick={() => setStep((s) => s + 1)}>
            Continue
            <ArrowRight size={16} weight="bold" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() =>
              onConnect({
                id: `a${Date.now()}`,
                nickname: nickname || "Main account",
                broker: brokerMeta?.name ?? "Paper",
                mode: isPaper ? "PAPER" : "LIVE",
                balance: isPaper ? 10000 : 0,
                active: false,
              })
            }
          >
            <Check size={16} weight="bold" />
            Connect
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
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-fg">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus-visible:border-accent focus-visible:outline-none"
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
