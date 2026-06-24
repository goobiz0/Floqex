"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadSimple, User, At, DiscordLogo, CurrencyDollar, DeviceMobile, Globe } from "@phosphor-icons/react";
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
  notifySms: boolean;
  smsNumber: string;
  notifyCustomWebhook: boolean;
  customWebhookUrl: string;
  notifyEveryTrade: boolean;
  notifyCustomTrade: boolean;
  notifyCustomRisk: boolean;
  notifyCustomError: boolean;
  dailyLossAlertPct: number;
  drawdownAlertPct: number;
  globalKillSwitch: boolean;
  maxGlobalDrawdown: number;
};

import { generateMcpKey } from "@/app/dashboard/settings/actions";
import { usePrivacy } from "@/components/privacy-provider";
import { useDisplayMode } from "@/components/display-provider";
import { TerminalWindow, Copy, Check, Eye, EyeSlash, CaretDown, Question } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Dropdown } from "@/components/ui/dropdown";

function InfoTooltip({ text }: { text: React.ReactNode }) {
  if (!text) return null;
  return (
    <span className="group relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      <Question size={14} className="text-fg-subtle hover:text-fg transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-[var(--radius-card)] bg-elevated border border-line p-2.5 text-xs font-medium text-fg opacity-0 transition-all duration-200 group-hover:opacity-100 shadow-[var(--shadow-md)] whitespace-normal text-left leading-relaxed translate-y-1 group-hover:translate-y-0">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-line" />
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-elevated -mt-[2px]" />
      </span>
    </span>
  );
}

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
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const { displayMode, setDisplayMode } = useDisplayMode();
  const [notifyDiscord, setNotifyDiscord] = useState(settings.notifyDiscord);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail);
  const [notifyPush, setNotifyPush] = useState(settings.notifyPush);
  const [notifySms, setNotifySms] = useState(settings.notifySms);
  const [smsNumber, setSmsNumber] = useState(settings.smsNumber);
  const [notifyCustomWebhook, setNotifyCustomWebhook] = useState(settings.notifyCustomWebhook);
  const [customWebhookUrl, setCustomWebhookUrl] = useState(settings.customWebhookUrl);
  const [notifyEveryTrade, setNotifyEveryTrade] = useState(settings.notifyEveryTrade);
  const [notifyCustomTrade, setNotifyCustomTrade] = useState(settings.notifyCustomTrade);
  const [notifyCustomRisk, setNotifyCustomRisk] = useState(settings.notifyCustomRisk);
  const [notifyCustomError, setNotifyCustomError] = useState(settings.notifyCustomError);
  const [webhookUrl, setWebhookUrl] = useState(settings.discordWebhookUrl);
  const [dailyLoss, setDailyLoss] = useState(String(settings.dailyLossAlertPct));
  const [drawdown, setDrawdown] = useState(String(settings.drawdownAlertPct));
  const [globalKillSwitch, setGlobalKillSwitch] = useState(settings.globalKillSwitch);
  const [maxGlobalDrawdown, setMaxGlobalDrawdown] = useState(String(settings.maxGlobalDrawdown));
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<"GENERAL" | "SECURITY" | "AFFILIATE" | "CUSTOMISATION">("GENERAL");

  function savePrefs() {
    setSaved(false);
    setSaveError(null);
    startSaving(async () => {
      const res = await updateNotificationPreferences({
        discordWebhookUrl: webhookUrl,
        notifyDiscord,
        notifyEmail,
        notifyPush,
        notifySms,
        smsNumber,
        notifyCustomWebhook,
        customWebhookUrl,
        notifyCustomTrade,
        notifyCustomRisk,
        notifyCustomError,
        notifyEveryTrade,
        dailyLossAlertPct: Number(dailyLoss),
        drawdownAlertPct: Number(drawdown),
        globalKillSwitch,
        maxGlobalDrawdown: Number(maxGlobalDrawdown),
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
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 border-b border-line pb-4 overflow-x-auto relative">
        {(["GENERAL", "SECURITY", "AFFILIATE", "CUSTOMISATION"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 text-sm font-semibold rounded-[var(--radius-pill)] transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? "text-fg" 
                : "text-fg-subtle hover:text-fg"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="settings-tab-pill"
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-surface shadow-[var(--shadow-sm)] border border-line"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.charAt(0) + tab.slice(1).toLowerCase()}</span>
          </button>
        ))}
      </div>

      {activeTab === "GENERAL" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ProfileSettings />
          
          <Card className="p-5">
            <CardTitle>Broker Connections</CardTitle>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-fg-subtle mb-4">
                Manage your connected brokerage accounts. Use Ping/Verify to ensure the API connection is healthy.
              </p>
              {accounts.length === 0 ? (
                <p className="text-sm text-fg-muted">No accounts connected yet.</p>
              ) : (
                <div className="divide-y divide-line border-t border-line">
                  {accounts.map((acc) => (
                    <BrokerConnectionRow key={acc.id} account={acc} />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Data Export</CardTitle>
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
                verifyWord="RESET"
              />
              <DangerAction
                title="Delete account"
                desc="Permanently remove your account and all data."
                label="Delete"
                run={deleteUserAccount}
                onSuccess={() => signOut({ redirectUrl: marketingUrl() })}
                verifyWord="DELETE"
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "SECURITY" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <McpSettings mcpKey={mcpKey} />
          
          <Card className="p-5">
            <CardTitle>Global Risk Controls</CardTitle>
            <div className="mt-4 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-fg">Global Kill Switch</p>
                  <InfoTooltip text="Immediately halt all trading across all connected broker accounts." />
                </div>
                <Switch checked={globalKillSwitch} onChange={setGlobalKillSwitch} label="Global Kill Switch" />
              </div>
              <Threshold id="max-global-drawdown" label="Max Global Drawdown" help="Halt all trading if total portfolio drops by this percent." suffix="%" value={maxGlobalDrawdown} onChange={setMaxGlobalDrawdown} />
              <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
                <Button size="sm" onClick={savePrefs} disabled={saving}>
                  {saving ? "Saving…" : "Save global risk settings"}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Circuit Breakers (Max Daily Drawdown)</CardTitle>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-fg-subtle mb-4">
                If an account hits its daily loss limit, Floqex will automatically stop the bot for 24 hours.
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

          <SecurityAuditLog />
        </div>
      )}

      {activeTab === "AFFILIATE" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-10 text-center flex flex-col items-center justify-center border-dashed border-line">
            <div className="h-16 w-16 bg-surface border border-line rounded-full flex items-center justify-center text-fg-subtle mb-4">
              <CurrencyDollar size={32} weight="duotone" />
            </div>
            <h3 className="text-xl font-bold text-fg mb-2">Partner Program</h3>
            <p className="text-fg-subtle mb-6 max-w-sm">
              Earn a percentage of subscription revenue for every trader you refer to Floqex.
            </p>
            <Button onClick={() => alert("The Floqex Partner Program is coming soon!")} className="bg-accent text-black hover:bg-accent/90">
              Apply to Partner Program
            </Button>
          </Card>
        </div>
      )}

      {activeTab === "CUSTOMISATION" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-5">
            <CardTitle>Theme & Display</CardTitle>
            <div className="mt-4 divide-y divide-line border-t border-line">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-fg">Application Theme</p>
                  <InfoTooltip text="Floqex is designed for dark mode, but you can toggle light mode here." />
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-fg">P&L Display Mode</p>
                  <InfoTooltip text="Choose how P&L values are shown across the platform." />
                </div>
                <Dropdown
                  align="right"
                  items={[
                    { label: "Money ($)", onClick: () => setDisplayMode("MONEY") },
                    { label: "Percentage (%)", onClick: () => setDisplayMode("PERCENTAGE") },
                    { label: "Hidden (XX.XX)", onClick: () => setDisplayMode("HIDDEN") },
                  ]}
                  trigger={
                    <button className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-sm hover:border-line-strong hover:bg-surface-hover transition-colors min-w-[120px]">
                      <span>{displayMode === "MONEY" ? "Money ($)" : displayMode === "PERCENTAGE" ? "Percentage (%)" : "Hidden (XX.XX)"}</span>
                      <CaretDown size={12} className="text-fg-subtle" />
                    </button>
                  }
                />
              </div>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-fg flex items-center gap-2">
                    Privacy Mode {isPrivacyMode ? <EyeSlash size={14} className="text-fg-subtle" /> : <Eye size={14} className="text-fg-subtle" />}
                  </p>
                  <InfoTooltip text="Blur sensitive financial data and personal info." />
                </div>
                <Switch checked={isPrivacyMode} onChange={togglePrivacyMode} label="Privacy Mode" />
              </div>
            </div>
          </Card>

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
              <Channel label="SMS" desc="Critical alerts via text message" checked={notifySms} onChange={setNotifySms} />
              {notifySms && (
                <div className="space-y-1.5 py-3">
                  <Label htmlFor="sms-number">Phone Number</Label>
                  <Input
                    id="sms-number"
                    type="tel"
                    icon={<DeviceMobile weight="fill" />}
                    placeholder="+1 (555) 000-0000"
                    value={smsNumber}
                    onChange={(e) => setSmsNumber(e.target.value)}
                  />
                </div>
              )}
              <Channel label="Custom Webhook" desc="Forward events to your own server" checked={notifyCustomWebhook} onChange={setNotifyCustomWebhook} />
              {notifyCustomWebhook && (
                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-webhook">Webhook URL</Label>
                    <Input
                      id="custom-webhook"
                      type="url"
                      icon={<Globe weight="fill" />}
                      placeholder="https://api.yourdomain.com/webhook"
                      value={customWebhookUrl}
                      onChange={(e) => setCustomWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3 rounded-md bg-surface/50 p-4 border border-line">
                    <p className="text-sm font-medium text-fg mb-2">Events to send</p>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal text-fg-subtle">Risk & Circuit Breakers</Label>
                      <Switch checked={notifyCustomRisk} onChange={setNotifyCustomRisk} label="Risk" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal text-fg-subtle">System Errors</Label>
                      <Switch checked={notifyCustomError} onChange={setNotifyCustomError} label="Errors" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal text-fg-subtle">Trade Executions</Label>
                      <Switch checked={notifyCustomTrade} onChange={setNotifyCustomTrade} label="Trades" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-5 border-t border-line pt-5">
              <Threshold id="daily-loss-alert" label="Daily loss alert" help="Notify when the day's loss reaches this percent." suffix="%" value={dailyLoss} onChange={setDailyLoss} />
              <Threshold id="drawdown-alert" label="Drawdown alert" help="Notify when drawdown from peak reaches this percent." suffix="%" value={drawdown} onChange={setDrawdown} />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-fg">Notify on every trade</p>
                  <InfoTooltip text="Off by default to avoid noise." />
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
        </div>
      )}
    </div>
  );
}

// ... ProfileSettings and other components remain the same ...
// Skipping to DangerAction:

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
      <div className="flex items-center">
        <p className="text-sm font-medium text-fg">{label}</p>
        <InfoTooltip text={desc} />
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2">
      <div>
        <Label htmlFor={id} className="flex items-center text-sm font-medium text-fg">
          {label}
          <InfoTooltip text={help} />
        </Label>
      </div>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={0.5}
        trailing={suffix}
        className="tnum w-32"
      />
    </div>
  );
}

function DangerAction({
  title,
  desc,
  label,
  run,
  onSuccess,
  verifyWord,
}: {
  title: string;
  desc: string;
  label: string;
  run: () => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
  verifyWord?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    setError(null);
    if (!verifyWord && !armed) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-subtle">{desc}</p>
          {verifyWord && (
             <div className="mt-3">
               <Input 
                 placeholder={`Type ${verifyWord} to confirm`} 
                 value={verifyInput} 
                 onChange={e => setVerifyInput(e.target.value)} 
                 className="h-8 text-xs max-w-[200px]"
               />
             </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending || (verifyWord ? verifyInput !== verifyWord : false)}
          className="shrink-0 rounded-[var(--radius-control)] border border-negative/50 px-3 py-1.5 text-sm font-medium text-negative transition-colors hover:bg-negative-soft active:scale-[0.97] disabled:opacity-50"
        >
          {pending ? "Working…" : (!verifyWord && armed) ? "Click to confirm" : label}
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

function SecurityAuditLog() {
  const MOCK_LOGS = [
    { id: 1, action: "Login successful", ip: "192.168.1.42", time: "2026-06-24 09:00:01" },
    { id: 2, action: "Broker API key encrypted", ip: "192.168.1.42", time: "2026-06-23 15:30:12" },
    { id: 3, action: "Notification preferences updated", ip: "192.168.1.42", time: "2026-06-22 10:11:40" },
    { id: 4, action: "New paper account created", ip: "192.168.1.42", time: "2026-06-21 14:22:05" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <CardTitle>Security Audit Log</CardTitle>
      </div>
      <p className="text-sm text-fg-subtle mb-4">
        Review recent security events and account activity.
      </p>
      
      <div className="border border-line rounded-[var(--radius-control)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/30 text-fg-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">IP Address</th>
              <th className="px-4 py-2 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-base/40">
            {MOCK_LOGS.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-fg">{log.action}</td>
                <td className="px-4 py-2 text-fg-muted font-mono text-xs">{log.ip}</td>
                <td className="px-4 py-2 text-fg-muted whitespace-nowrap">{log.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BrokerConnectionRow({ account }: { account: SettingsAccount }) {
  const [status, setStatus] = useState<"idle" | "pinging" | "success" | "error">("idle");

  function handlePing() {
    setStatus("pinging");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    }, 1000);
  }

  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-medium text-fg">{account.nickname}</p>
        <p className="text-xs text-fg-subtle">{account.broker}</p>
      </div>
      <div className="flex items-center gap-3">
        {status === "success" && <span className="text-xs font-medium text-profit">Verified</span>}
        {status === "error" && <span className="text-xs font-medium text-negative">Failed</span>}
        <Button size="sm" variant="secondary" onClick={handlePing} disabled={status === "pinging"}>
          {status === "pinging" ? "Pinging..." : "Ping/Verify"}
        </Button>
      </div>
    </div>
  );
}
