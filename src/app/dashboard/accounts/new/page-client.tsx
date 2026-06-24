"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Plug, Key, ShieldCheck, CheckCircle, WarningCircle, CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { connectAccount } from "../actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Broker, AccountMode } from "@prisma/client";

const BROKERS: { id: Broker; name: string; type: "CRYPTO" | "TRADFI" | "FOREX" | "SIMULATION", requiresKeys: boolean }[] = [
  { id: "PAPER", name: "Floqex Simulator", type: "SIMULATION", requiresKeys: false },
  { id: "ALPACA", name: "Alpaca", type: "TRADFI", requiresKeys: true },
  { id: "OANDA", name: "Oanda", type: "FOREX", requiresKeys: true },
  { id: "IBKR", name: "Interactive Brokers", type: "TRADFI", requiresKeys: true },
  { id: "TRADOVATE", name: "Tradovate", type: "TRADFI", requiresKeys: true },
  { id: "SCHWAB", name: "Charles Schwab", type: "TRADFI", requiresKeys: true },
  { id: "COINBASE", name: "Coinbase Advanced", type: "CRYPTO", requiresKeys: true },
  { id: "BINANCE", name: "Binance", type: "CRYPTO", requiresKeys: true },
  { id: "KRAKEN", name: "Kraken", type: "CRYPTO", requiresKeys: true },
];

export function AccountsNewClient({ plan }: { plan: string }) {
  const router = useRouter();
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [mode, setMode] = useState<AccountMode>("PAPER");
  
  const [nickname, setNickname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const brokerData = BROKERS.find(b => b.id === selectedBroker);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBroker || !brokerData) return;

    if (brokerData.requiresKeys && (!apiKey || !apiSecret)) {
      toast.error("API keys are required for live brokers.");
      return;
    }

    if (!nickname) {
      toast.error("Please provide an account nickname.");
      return;
    }

    setLoading(true);
    const res = await connectAccount({
      nickname,
      broker: selectedBroker,
      mode,
      apiKey: brokerData.requiresKeys ? apiKey : undefined,
      apiSecret: brokerData.requiresKeys ? apiSecret : undefined,
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Account connected successfully.");
      router.push("/dashboard/accounts");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to connect account.");
    }
  }

  if (selectedBroker && brokerData) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <button 
          onClick={() => setSelectedBroker(null)}
          className="flex items-center gap-2 text-sm font-medium text-fg-subtle hover:text-fg transition-colors mb-6"
        >
          <CaretLeft size={16} /> Back to broker list
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-elevated p-6 md:p-8">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-line">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-surface border border-line">
                <Plug size={24} className="text-fg" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-fg">Connect {brokerData.name}</h2>
                <p className="text-sm text-fg-subtle">
                  {brokerData.requiresKeys ? "Securely connect your account via API keys." : "Instantly provision a simulated trading account."}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-fg">Account Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. My Main Live Account"
                  className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-fg">Trading Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMode("PAPER")}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-[var(--radius-control)] border text-center transition-colors",
                      mode === "PAPER" ? "border-accent bg-accent/5 text-accent" : "border-line bg-surface text-fg-subtle hover:border-fg-muted"
                    )}
                  >
                    <span className="font-semibold text-sm mb-1">Paper Trading</span>
                    <span className="text-xs">Simulated funds</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("LIVE")}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-[var(--radius-control)] border text-center transition-colors",
                      mode === "LIVE" ? "border-accent bg-accent/5 text-accent" : "border-line bg-surface text-fg-subtle hover:border-fg-muted"
                    )}
                  >
                    <span className="font-semibold text-sm mb-1">Live Trading</span>
                    <span className="text-xs">Real funds, real risk</span>
                  </button>
                </div>
                {mode === "LIVE" && plan === "FREE" && (
                  <p className="mt-3 text-xs flex items-center gap-1.5 text-warning">
                    <WarningCircle size={14} weight="bold" />
                    Live trading requires the Trader or Pro plan. <Link href="/dashboard/billing" className="underline font-medium ml-1">Upgrade</Link>
                  </p>
                )}
              </div>

              {brokerData.requiresKeys && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-fg">API Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Paste your API key"
                      className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-fg">API Secret</label>
                    <input
                      type="password"
                      value={apiSecret}
                      onChange={e => setApiSecret(e.target.value)}
                      placeholder="Paste your API secret"
                      className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent font-mono"
                      required
                    />
                  </div>
                </>
              )}

              <div className="rounded-[var(--radius-card)] bg-surface border border-line p-4 flex items-start gap-3 mt-6">
                <ShieldCheck size={20} className="text-fg-subtle mt-0.5 shrink-0" />
                <p className="text-xs text-fg-subtle leading-relaxed">
                  Your API credentials are encrypted with AES-256-GCM before being stored. They are never exposed to the client and are only decrypted locally by the execution engine at the exact moment a trade is placed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setSelectedBroker(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (mode === "LIVE" && plan === "FREE")}>
              {loading ? "Connecting..." : "Connect Account"}
            </Button>
          </div>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {BROKERS.map((broker) => (
        <button
          key={broker.id}
          onClick={() => setSelectedBroker(broker.id)}
          className="group flex flex-col items-start rounded-[var(--radius-card)] border border-line bg-elevated p-6 text-left transition-all hover:-translate-y-1 hover:shadow-md hover:border-accent"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface transition-colors group-hover:bg-accent group-hover:border-accent/30 group-hover:text-[var(--color-on-accent)] text-fg">
            <Plug size={24} />
          </div>
          <h3 className="text-[15px] font-semibold text-fg">{broker.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-fg-faint">
              {broker.type}
            </span>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            {broker.requiresKeys ? "Connect via API Keys" : "Instantly provisioned simulator"}
          </p>
        </button>
      ))}
    </div>
  );
}
