import { ShieldCheck, Info, Key, CheckCircle, Warning, LockKey, TerminalWindow } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Brokers & Connections | Floqex Docs",
  description: "How to securely connect your live brokerage accounts.",
};

export default function BrokersPage() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
          <Key size={14} weight="bold" />
          Live Execution
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Brokers & Connections</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          Transitioning from Paper to Live trading requires connecting a supported brokerage account. Floqex uses secure, encrypted API keys to execute trades directly on your behalf without ever touching your funds.
        </p>
      </header>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Supported Integrations</h2>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          
          <div className="rounded-[var(--radius-card)] border border-accent bg-surface p-6 shadow-[0_0_15px_rgba(var(--color-accent),0.1)] relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 inset-x-0 h-1 bg-accent" />
            <div className="h-16 w-16 rounded-2xl bg-[#FCD535]/10 flex items-center justify-center text-[#FCD535] mb-4">
              <span className="font-bold text-3xl">🦙</span>
            </div>
            <h3 className="text-xl font-semibold text-fg">Alpaca Markets</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Commission-free API trading. Best for US Equities. We fully support Alpaca's REST v2 API, including OCO (One-Cancels-Other) bracket orders and fractional shares.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-positive bg-positive/10 px-3 py-1.5 rounded-full border border-positive/20">
              <CheckCircle size={16} weight="fill" /> Fully Supported & Tested
            </div>
          </div>
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm flex flex-col items-center text-center opacity-80 grayscale-[30%]">
            <div className="h-16 w-16 rounded-2xl bg-[#000000]/10 border border-line flex items-center justify-center text-fg mb-4">
              <span className="font-bold text-2xl">TS</span>
            </div>
            <h3 className="text-xl font-semibold text-fg">TradeStation</h3>
            <p className="mt-2 text-sm text-fg-subtle leading-relaxed">
              Advanced institutional-grade routing for Equities and Futures. Deep integration is currently in beta testing for our professional users.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-warning bg-warning/10 px-3 py-1.5 rounded-full border border-warning/20">
              <Warning size={16} weight="fill" /> Private Beta Access Only
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture */}
      <section className="space-y-6 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">How We Secure Your Keys</h2>
        <div className="bg-surface rounded-[var(--radius-card)] border border-line overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 shrink-0 bg-accent/10 text-accent rounded-full flex items-center justify-center">
                <LockKey size={20} weight="fill" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-fg">AES-256-GCM Encryption</h3>
                <p className="text-sm text-fg-subtle leading-relaxed">
                  The moment you paste your API keys into the dashboard, they are encrypted client-side and then re-encrypted at rest in our database using industry-standard AES-256-GCM. Our front-end cannot read your keys once they are saved.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 shrink-0 bg-accent/10 text-accent rounded-full flex items-center justify-center">
                <TerminalWindow size={20} weight="fill" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-fg">In-Memory Decryption</h3>
                <p className="text-sm text-fg-subtle leading-relaxed">
                  Keys are only ever decrypted in-memory inside the secure execution enclave at the exact moment a trade signal is generated. They are never logged or stored in plain text anywhere on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Connection Guide (Alpaca)</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-base border border-line p-4 rounded-xl">
            <div className="h-8 w-8 rounded bg-surface border border-line flex items-center justify-center font-mono text-sm font-bold">1</div>
            <div>
              <strong className="text-fg block">Upgrade to Trader Plan</strong>
              <span className="text-sm text-fg-subtle">Live broker connections are only available on paid tiers. Navigate to Billing to upgrade.</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-base border border-line p-4 rounded-xl">
            <div className="h-8 w-8 rounded bg-surface border border-line flex items-center justify-center font-mono text-sm font-bold">2</div>
            <div>
              <strong className="text-fg block">Generate API Keys</strong>
              <span className="text-sm text-fg-subtle">Log into your Alpaca dashboard. Create new keys. <strong className="text-negative">Crucial: Ensure keys have Trade permissions but NO Transfer/Withdrawal permissions.</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-base border border-line p-4 rounded-xl">
            <div className="h-8 w-8 rounded bg-surface border border-line flex items-center justify-center font-mono text-sm font-bold">3</div>
            <div>
              <strong className="text-fg block">Paste into Floqex</strong>
              <span className="text-sm text-fg-subtle">Go to the Accounts Dashboard. Click "Connect Live Account" and input your Key ID and Secret.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
