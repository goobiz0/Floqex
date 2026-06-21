"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@clerk/nextjs";
import type { TradeRow } from "@/lib/metrics";
import { updateCircuitBreaker } from "@/app/dashboard/accounts/actions";
import { useTransition } from "react";

/** Quote a CSV cell and escape embedded quotes so commas/newlines stay safe. */
function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(trades: TradeRow[]) {
  const header = [
    "id",
    "openedAt",
    "closedAt",
    "instrument",
    "direction",
    "session",
    "entry",
    "exit",
    "rMultiple",
    "netPnl",
  ];
  const rows = trades.map((t) =>
    [
      t.id,
      t.openedAt,
      t.closedAt ?? "",
      t.instrument,
      t.direction,
      t.session,
      t.entryPrice,
      t.exitPrice ?? "",
      t.rMultiple ?? "",
      t.netPnl ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "floqex-trades.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsView({ trades, accounts = [] }: { trades: TradeRow[], accounts?: any[] }) {
  const [discord, setDiscord] = useState(true);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [perTrade, setPerTrade] = useState(false);

  return (
    <div className="max-w-2xl space-y-4">
      <ProfileSettings />

      <Card className="p-5">
        <CardTitle>Notification channels</CardTitle>
        <div className="mt-4 divide-y divide-line">
          <Channel label="Discord" desc="Decision feed and milestone alerts" checked={discord} onChange={setDiscord} />
          {discord && (
            <div className="py-3">
              <label className="text-sm text-fg-muted">Webhook URL</label>
              <input
                placeholder="https://discord.com/api/webhooks/..."
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus-visible:border-accent focus-visible:outline-none"
              />
            </div>
          )}
          <Channel label="Email" desc="Daily summary and important alerts" checked={email} onChange={setEmail} />
          <Channel label="Push" desc="Browser push notifications" checked={push} onChange={setPush} />
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Circuit Breakers (Max Daily Drawdown)</CardTitle>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-fg-subtle mb-4">
            If an account hits its daily loss limit, Mochi will automatically stop the bot for 24 hours to prevent revenge trading.
          </p>
          {accounts.length === 0 ? (
            <p className="text-sm text-fg-muted">No accounts connected yet.</p>
          ) : (
            <div className="divide-y divide-line border-t border-line">
              {accounts.map(acc => (
                <CircuitBreakerRow key={acc.id} account={acc} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Alert thresholds</CardTitle>
        <div className="mt-4 space-y-5">
          <Threshold label="Daily loss alert" help="Notify when the day's loss reaches this percent." suffix="%" defaultValue={2.5} />
          <Threshold label="Drawdown alert" help="Notify when drawdown from peak reaches this percent." suffix="%" defaultValue={8} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-fg">Notify on every trade</p>
              <p className="mt-1 text-xs text-fg-subtle">Off by default to avoid noise.</p>
            </div>
            <Switch checked={perTrade} onChange={setPerTrade} label="Notify on every trade" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <CardTitle>Data</CardTitle>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fg">Export trades</p>
            <p className="text-xs text-fg-subtle">Download your full trade history as CSV.</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCsv(trades)}
            disabled={trades.length === 0}
          >
            <DownloadSimple size={16} />
            Download CSV
          </Button>
        </div>
      </Card>

      <Card className="border-negative/40 p-5">
        <CardTitle>Danger zone</CardTitle>
        <div className="mt-4 space-y-3">
          <DangerRow
            title="Reset paper account"
            desc="Clear all paper trades and reset the balance to $10,000."
            action="Reset"
          />
          <DangerRow
            title="Delete account"
            desc="Permanently remove your account and all data."
            action="Delete"
          />
        </div>
      </Card>
    </div>
  );
}

function ProfileSettings() {
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isLoaded && user && firstName === "" && lastName === "" && (user.firstName || user.lastName)) {
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSuccess(false);
    try {
      await user.update({ firstName, lastName });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden border border-line bg-elevated shadow-sm">
      <div className="border-b border-line bg-surface/30 px-6 py-5">
        <h2 className="text-base font-semibold text-fg">Personal details</h2>
        <p className="mt-1 text-sm text-fg-subtle">Update your name and profile settings.</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-fg">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg shadow-sm transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-[13px] font-medium text-fg">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg shadow-sm transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/20"
            />
          </div>
        </div>
        <div className="max-w-md">
          <label className="mb-2 block text-[13px] font-medium text-fg">Email address</label>
          <div className="flex w-full items-center rounded-xl border border-line/50 bg-surface/30 px-4 py-2.5 shadow-inner">
            <span className="text-sm text-fg-muted cursor-not-allowed">
              {user?.primaryEmailAddress?.emailAddress || "Loading..."}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-fg-subtle">To change your email address, please contact support.</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-line bg-surface/30 px-6 py-4">
        <span className="text-[13px] text-fg-subtle">
          Please use your real name to ensure compliance.
        </span>
        <div className="flex items-center gap-4">
          {success && (
            <span className="text-[13px] font-medium text-positive animate-in fade-in slide-in-from-right-2">
              Saved successfully
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={saving || !isLoaded || (firstName === user?.firstName && lastName === user?.lastName)}
            className="rounded-xl px-5 transition-transform active:scale-95"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Channel({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-subtle">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Threshold({
  label,
  help,
  suffix,
  defaultValue,
}: {
  label: string;
  help: string;
  suffix: string;
  defaultValue: number;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-fg">{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          defaultValue={defaultValue}
          step={0.5}
          className="tnum w-28 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-fg focus-visible:border-accent focus-visible:outline-none"
        />
        <span className="text-sm text-fg-subtle">{suffix}</span>
      </div>
      <p className="mt-1.5 text-xs text-fg-subtle">{help}</p>
    </div>
  );
}

function DangerRow({ title, desc, action }: { title: string; desc: string; action: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-base/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-fg-subtle">{desc}</p>
      </div>
      <button
        type="button"
        className="rounded-[var(--radius-control)] border border-negative/50 px-3 py-1.5 text-sm font-medium text-negative transition-colors hover:bg-negative-soft active:scale-[0.97]"
      >
        {action}
      </button>
    </div>
  );
}

function CircuitBreakerRow({ account }: { account: any }) {
  const [amount, setAmount] = useState(account.maxDailyDrawdown ? Number(account.maxDailyDrawdown) : "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const val = amount === "" ? null : Number(amount);
      const res = await updateCircuitBreaker(account.id, val);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-medium text-fg">{account.nickname}</p>
        <p className="text-xs text-fg-subtle">{account.broker}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">$</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="No limit"
            className="tnum w-32 rounded-[var(--radius-control)] border border-line bg-surface pl-7 pr-3 py-1.5 text-sm text-fg focus-visible:border-accent focus-visible:outline-none placeholder:text-fg-faint"
          />
        </div>
        <Button 
          size="sm" 
          variant="secondary"
          onClick={handleSave}
          disabled={pending || Number(account.maxDailyDrawdown) === Number(amount) || (amount === "" && account.maxDailyDrawdown === null)}
        >
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
