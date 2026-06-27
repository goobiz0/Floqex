/**
 * Broker connection strip under the hero. Real broker names shown as honest
 * monogram lockups (no fabricated partnership marks). Logos-only, no category
 * labels. Sits below the hero, never inside it.
 */
const brokers = [
  { name: "OANDA", mono: "OA" },
  { name: "Interactive Brokers", mono: "IB" },
  { name: "Tradovate", mono: "TV" },
  { name: "Alpaca", mono: "AL" },
  { name: "Coinbase", mono: "CB" },
];

export function BrokerStrip() {
  return (
    <section className="border-y border-line bg-elevated/40">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <p className="text-sm font-medium text-fg-subtle">
          Connects to the brokers you already trade with
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {brokers.map((b) => (
            <li
              key={b.name}
              className="group flex items-center gap-2.5 text-fg-subtle transition-colors hover:text-fg"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface font-mono text-xs font-semibold text-fg-muted transition-colors group-hover:border-line-strong">
                {b.mono}
              </span>
              <span className="text-[0.95rem] font-medium tracking-tight">
                {b.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
