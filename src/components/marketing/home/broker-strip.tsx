/**
 * Broker connection strip under the hero. Real broker names shown as honest
 * monogram lockups. Cleaner layout.
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
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center gap-8 px-6 py-10">
        <p className="text-sm font-medium text-fg-subtle text-center">
          Connects directly to the brokers you already trade with
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:gap-x-10">
          {brokers.map((b) => (
            <li
              key={b.name}
              className="group flex items-center gap-3 text-fg-subtle transition-colors hover:text-fg hover:-translate-y-0.5 duration-300"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface font-mono text-sm font-semibold text-fg-muted transition-colors group-hover:border-line-strong group-hover:text-accent">
                {b.mono}
              </span>
              <span className="text-[1rem] font-medium tracking-tight">
                {b.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
