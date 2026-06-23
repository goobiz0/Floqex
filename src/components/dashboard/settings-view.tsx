"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadSimple, User, At, DiscordLogo, CurrencyDollar } from "@phosphor-icons/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useUser, useClerk } from "@clerk/nextjs";
import type { TradeRow } from "@/lib/metrics";
import { updateCircuitBreaker } from "@/app/dashboard/accounts/actions";
import {
  resetPaperAccount,
  deleteUserAccount,
  updateNotificationPreferences,
} from "@/app/dashboard/settings/actions";
import { marketingUrl } from "@/lib/urls";

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

type NotificationSettings = {
  discordWebhookUrl: string;
  notifyDiscord: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyEveryTrade: boolean;
  dailyLossAlertPct: number;
  drawdownAlertPct: number;
};

import { generateMcpKey } from "@/app/dashboard/settings/actions";
import { TerminalWindow, Copy, Check } from "@phosphor-icons/react";

export function SettingsView({
  trades,
  accounts = [],
  settings,
  mcpKey,
}: {
  trades: TradeRow[];
  accounts?: SettingsAccount[];
  settings: NotificationSettings;
  mcpKey?: string;
}) {
  const [notifyDiscord, setNotifyDiscord] = useState(settings.notifyDiscord);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail);
  const [notifyPush, setNotifyPush] = useState(settings.notifyPush);
  const [notifyEveryTrade, setNotifyEveryTrade] = useState(settings.notifyEveryTrade);
  const [webhookUrl, setWebhookUrl] = useState(settings.discordWebhookUrl);
  const [dailyLoss, setDailyLoss] = useState(String(settings.dailyLossAlertPct));
  const [drawdown, setDrawdown] = useState(String(settings.drawdownAlertPct));
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const { signOut } = useClerk();

  function savePrefs() {
    setSaved(false);
    setSaveError(null);
    startSaving(async () => {
      const res = await updateNotificationPreferences({
        discordWebhookUrl: webhookUrl,
        notifyDiscord,
        notifyEmail,
        notifyPush,
        notifyEveryTrade,
        dailyLossAlertPct: Number(dailyLoss),
        drawdownAlertPct: Number(drawdown),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(res.error ?? "Could not save preferences.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <ProfileSettings />

      <Card className="p-5">
        <CardTitle>Appearance</CardTitle>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-fg">Theme</p>
            <p className="text-xs text-fg-subtle">Toggle between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <McpSettings mcpKey={mcpKey} />


      <Card className="p-5">
        <CardTitle>Notifications</CardTitle>
        <div className="mt-4 divide-y divide-line">
          <Channel label="Discord" desc="Decision feed and milestone alerts" checked={notifyDiscord} onChange={setNotifyDiscord} />
          {notifyDiscord && (
            <div className="space-y-1.5 py-3">
              <Label htmlFor="discord-webhook">Webhook URL</Label>
              <Input
                id="discord-webhook"
                type="url"
                icon={<DiscordLogo weight="fill" />}
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
          )}
          <Channel label="Email" desc="Daily summary and important alerts" checked={notifyEmail} onChange={setNotifyEmail} />
          <Channel label="Push" desc="Browser push notifications" checked={notifyPush} onChange={setNotifyPush} />
        </div>

        <div className="mt-5 space-y-5 border-t border-line pt-5">
          <Threshold id="daily-loss-alert" label="Daily loss alert" help="Notify when the day's loss reaches this percent." suffix="%" value={dailyLoss} onChange={setDailyLoss} />
          <Threshold id="drawdown-alert" label="Drawdown alert" help="Notify when drawdown from peak reaches this percent." suffix="%" value={drawdown} onChange={setDrawdown} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-fg">Notify on every trade</p>
              <p className="mt-1 text-xs text-fg-subtle">Off by default to avoid noise.</p>
            </div>
            <Switch checked={notifyEveryTrade} onChange={setNotifyEveryTrade} label="Notify on every trade" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-line pt-4">
          {saved ? <span className="text-xs font-medium text-profit">Saved</span> : null}
          {saveError ? <span className="text-xs text-negative">{saveError}</span> : null}
          <Button size="sm" onClick={savePrefs} disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </Button>
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
              {accounts.map((acc) => (
                <CircuitBreakerRow key={acc.id} account={acc} />
              ))}
            </div>
          )}
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
          <DangerAction
            title="Reset paper account"
            desc="Clear all paper trades and reset the balance to $10,000."
            label="Reset"
            run={resetPaperAccount}
            onSuccess={() => router.refresh()}
          />
          <DangerAction
            title="Delete account"
            desc="Permanently remove your account and all data."
            label="Delete"
            run={deleteUserAccount}
            onSuccess={() => signOut({ redirectUrl: marketingUrl() })}
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
  value,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={0.5}
        trailing={suffix}
        className="tnum w-32"
      />
      <p className="text-xs text-fg-subtle">{help}</p>
    </div>
  );
}

function DangerAction({
  title,
  desc,
  label,
  run,
  onSuccess,
}: {
  title: string;
  desc: string;
  label: string;
  run: () => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    setError(null);
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    startTransition(async () => {
      const res = await run();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else onSuccess?.();
    });
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-line bg-base/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-subtle">{desc}</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="shrink-0 rounded-[var(--radius-control)] border border-negative/50 px-3 py-1.5 text-sm font-medium text-negative transition-colors hover:bg-negative-soft active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? "Working…" : armed ? "Click to confirm" : label}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-negative" role="alert">
          {error}
        </p>
      ) : null}
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

function McpSettings({ mcpKey }: { mcpKey?: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateMcpKey();
      if (!res.ok) alert(res.error);
    });
  }

  function handleCopy() {
    if (mcpKey) {
      navigator.clipboard.writeText(mcpKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <TerminalWindow size={20} className="text-accent" weight="duotone" />
        <CardTitle>Developer & MCP Server</CardTitle>
      </div>
      <p className="text-sm text-fg-subtle mb-4 leading-relaxed">
        Floqex exposes a native Model Context Protocol (MCP) server. Connect Cursor or Claude Desktop to analyze your account, fetch balances, and safely adjust bot parameters using natural language.
      </p>

      <div className="space-y-4">
        <div>
          <Label>SSE Endpoint URL</Label>
          <div className="mt-1.5 flex h-10 w-full items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3">
            <span className="truncate text-sm text-fg font-mono">
              https://app.floqex.com/api/mcp/sse
            </span>
          </div>
          <p className="text-xs text-fg-subtle mt-1.5">
            Use this URL in your MCP client configuration.
          </p>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <Label>Bearer Token</Label>
            {mcpKey && (
              <button 
                type="button" 
                onClick={handleCopy}
                className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 flex h-10 items-center rounded-[var(--radius-control)] border border-line bg-surface px-3">
              <span className="truncate text-sm text-fg-muted font-mono selection:bg-accent/20 selection:text-fg">
                {mcpKey ? mcpKey : "No key generated yet."}
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={pending}>
              {pending ? "Generating..." : mcpKey ? "Regenerate" : "Generate Key"}
            </Button>
          </div>
          <p className="text-xs text-fg-subtle mt-1.5">
            Pass this token as a Bearer token in your MCP client headers.
          </p>
        </div>
      </div>
    </Card>
  );
}
