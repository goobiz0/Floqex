/**
 * Broker connection strip. These are real broker names; since official marks
 * are not bundled, each is shown as a clean monogram lockup (honest, not a
 * fabricated partnership logo). Sits under the hero, not inside it.
 */
const brokers = [
  { name: "OANDA", mono: "OA" },
  { name: "Interactive Brokers", mono: "IB" },
  { name: "Tradovate", mono: "TV" },
  { name: "Alpaca", mono: "AL" },
];

export function LogoWall() {
  return (
    <section className="border-y border-line/70 bg-elevated/30">
      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6 lg:px-8">
        <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-fg-faint">
          Connects with your broker accounts
        </p>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-14">
          {brokers.map((b) => (
            <li
              key={b.name}
              className="group flex items-center gap-2.5 text-fg-subtle transition-colors hover:text-fg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface font-mono text-xs font-semibold tracking-tight text-fg-muted transition-colors group-hover:border-line-strong">
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
