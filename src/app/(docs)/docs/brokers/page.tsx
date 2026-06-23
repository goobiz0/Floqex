import { ShieldCheck, Info, Key, CheckCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Brokers & Connections | Floqex Docs",
  description: "How to securely connect your live brokerage accounts.",
};

export default function BrokersPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-fg">Brokers & Connections</h1>
        <p className="mt-4 text-lg text-fg-muted leading-relaxed">
          Transitioning from Paper to Live trading requires connecting a supported brokerage account. Floqex uses secure, encrypted API keys to execute trades directly on your behalf without ever touching your funds.
        </p>
      </header>

      <section className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">Supported Brokers</h2>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-[#FCD535]/10 flex items-center justify-center text-[#FCD535] mb-4">
              {/* Fake Alpaca Logo */}
              <span className="font-bold text-xl">🦙</span>
            </div>
            <h3 className="text-lg font-semibold text-fg">Alpaca Markets</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              Commission-free API trading. Best for US Equities. Full support for OCO (One-Cancels-Other) bracket orders.
            </p>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-positive bg-positive/10 px-2 py-1 rounded">
              <CheckCircle weight="fill" /> Fully Supported
            </div>
          </div>
          
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-[#000000]/5 flex items-center justify-center text-fg mb-4">
              <span className="font-bold text-xl">TS</span>
            </div>
            <h3 className="text-lg font-semibold text-fg">TradeStation</h3>
            <p className="mt-2 text-sm text-fg-subtle">
              Advanced institutional-grade routing. Coming Q3.
            </p>
            <div className="mt-4 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-warning bg-warning/10 px-2 py-1 rounded">
              Beta Access Only
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-fg border-b border-line pb-2">How to Connect</h2>
        <ol className="list-decimal list-inside space-y-4 text-fg-subtle">
          <li><strong>Upgrade to Trader Plan:</strong> Live broker connections are only available on the paid tier. Navigate to your <a href="/dashboard/billing" className="text-accent hover:underline">Billing Settings</a> to upgrade.</li>
          <li><strong>Generate API Keys:</strong> Log into your broker dashboard and generate a new set of API keys. Ensure the keys have <strong>Trade</strong> permissions but <strong>NOT</strong> Withdrawal permissions.</li>
          <li><strong>Add Connection:</strong> Navigate to the <a href="/dashboard/accounts" className="text-accent hover:underline">Accounts Dashboard</a> in Floqex and click "Connect Live Account". Paste your Key ID and Secret.</li>
        </ol>
      </section>

      <section className="space-y-4 mt-8">
        <div className="flex gap-4 p-4 rounded-xl border border-line bg-surface">
          <ShieldCheck size={24} className="shrink-0 text-accent" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-fg">Bank-Level Security</h4>
            <p className="text-sm text-fg-subtle leading-relaxed">
              Your API keys are encrypted at rest using AES-256-GCM. We cannot view your API secret after it is saved, and we never have the ability to withdraw or transfer funds from your broker. 
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
