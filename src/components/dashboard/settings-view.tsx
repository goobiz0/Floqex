"use client";

import { useState, useTransition } from "react";
import { DownloadSimple, User, At, DiscordLogo, CurrencyDollar } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import type { TradeRow } from "@/lib/metrics";
import { updateCircuitBreaker } from "@/app/dashboard/accounts/actions";

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

type SettingsAccount = {
  id: string;
  nickname: string;
  broker: string;
  maxDailyDrawdown: number | null;
};

export function SettingsView({
  trades,
  accounts = [],
}: {
  trades: TradeRow[];
  accounts?: SettingsAccount[];
}) {
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
            <div className="space-y-1.5 py-3">
              <Label htmlFor="discord-webhook">Webhook URL</Label>
              <Input
                id="discord-webhook"
                type="url"
                icon={<DiscordLogo weight="fill" />}
                placeholder="https://discord.com/api/webhooks/..."
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
          <Threshold id="daily-loss-alert" label="Daily loss alert" help="Notify when the day's loss reaches this percent." suffix="%" defaultValue={2.5} />
          <Threshold id="drawdown-alert" label="Drawdown alert" help="Notify when drawdown from peak reaches this percent." suffix="%" defaultValue={8} />
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
    } catch {
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-surface/30 px-6 py-5">
        <h2 className="text-base font-semibold text-fg">Personal details</h2>
        <p className="mt-1 text-sm text-fg-subtle">Update your name and profile settings.</p>
      </div>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              icon={<User />}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              icon={<User />}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="max-w-md space-y-1.5">
          <Label htmlFor="email-address">Email address</Label>
          <div className="flex h-10 w-full cursor-not-allowed items-center gap-2 rounded-[var(--radius-control)] border border-line bg-base/40 px-3">
            <At className="h-4 w-4 shrink-0 text-fg-faint" />
            <span className="truncate text-sm text-fg-muted">
              {user?.primaryEmailAddress?.emailAddress || "Loading…"}
            </span>
          </div>
          <p className="text-xs text-fg-subtle">
            To change your email address, please contact support.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line bg-surface/30 px-6 py-4">
        <span className="text-xs text-fg-subtle">
          Please use your real name to ensure compliance.
        </span>
        <div className="flex items-center gap-4">
          {success && (
            <span className="text-xs font-medium text-positive">Saved successfully</span>
          )}
          <Button
            onClick={handleSave}
            size="sm"
            disabled={
              saving ||
              !isLoaded ||
              (firstName === user?.firstName && lastName === user?.lastName)
            }
          >
            {saving ? "Saving…" : "Save changes"}
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
  id,
  label,
  help,
  suffix,
  defaultValue,
}: {
  id: string;
  label: string;
  help: string;
  suffix: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        defaultValue={defaultValue}
        step={0.5}
        trailing={suffix}
        className="tnum w-32"
      />
      <p className="text-xs text-fg-subtle">{help}</p>
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

function CircuitBreakerRow({ account }: { account: SettingsAccount }) {
  const [amount, setAmount] = useState(
    account.maxDailyDrawdown != null ? String(account.maxDailyDrawdown) : "",
  );
  const [pending, startTransition] = useTransition();
  const trimmed = amount.trim();
  const parsedAmount = trimmed === "" ? null : Number(trimmed);
  const isValidAmount = parsedAmount === null || Number.isFinite(parsedAmount);

  function handleSave() {
    if (!isValidAmount) return;
    startTransition(async () => {
      const res = await updateCircuitBreaker(account.id, parsedAmount);
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
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="No limit"
          icon={<CurrencyDollar />}
          invalid={!isValidAmount}
          className="tnum w-36"
          aria-label={`Max daily drawdown for ${account.nickname}`}
        />
        <Button
          size="sm" 
          variant="secondary"
          onClick={handleSave}
          disabled={pending || !isValidAmount || parsedAmount === account.maxDailyDrawdown}
        >
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
