import re

with open('src/components/dashboard/calendar-view.tsx', 'r') as f:
    content = f.read()

old_monthly_grid = """            <div className="min-w-0">
              <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", selectedMonth === null && "lg:grid-cols-3")}>
                {monthlyForYear.map(({ month, label, pnl, tradeCount }, i) => {
                  const active = tradeCount > 0;
                  const isSelected = selectedMonth === month;
                  return (
                    <motion.button
                      key={month}
                      type="button"
                      initial={{ opacity: 0, transform: "scale(0.97)" }}
                      animate={{ opacity: 1, transform: "scale(1)" }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2), ease: [0.23, 1, 0.32, 1] }}
                      onClick={() => setSelectedMonth(isSelected ? null : month)}
                      className={cn(
                        "group relative flex flex-col rounded-[var(--radius-card)] border bg-surface p-6 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                        isSelected
                          ? "border-fg shadow-[var(--shadow-md)] ring-1 ring-fg z-10"
                          : active
                            ? "border-line hover:border-line-strong"
                            : "border-line/60",
                      )}
                    >
                      {active && (
                        <div className={cn("pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br opacity-5 transition-opacity duration-200 group-hover:opacity-10", pnl > 0 ? "from-profit to-transparent" : pnl < 0 ? "from-negative to-transparent" : "from-fg-subtle to-transparent")} />
                      )}
                      <span className="relative z-10 mb-3 text-xs font-bold uppercase tracking-widest text-fg-subtle">{label}</span>
                      <span className={cn("relative z-10 mb-1 text-3xl font-bold tracking-tight tnum", active ? pnlTone(pnl) : "text-fg-faint")}>
                        {active ? <DisplayValue type="PNL" money={pnl} /> : "$0.00"}
                      </span>
                      <span className="relative z-10 mt-auto flex items-center justify-between border-t border-line/50 pt-4 text-xs font-medium text-fg-muted">
                        <span>Trades</span>
                        <span className={active ? "text-fg" : "text-fg-faint"}>{tradeCount}</span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>"""

new_monthly_grid = """            <div className="min-w-0">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {monthlyForYear.map(({ month, label, pnl, tradeCount }, i) => {
                  const active = tradeCount > 0;
                  const isSelected = selectedMonth === month;
                  return (
                    <motion.button
                      key={month}
                      initial={{ opacity: 0, transform: "scale(0.97)" }}
                      animate={{ opacity: 1, transform: "scale(1)" }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.008, 0.2), ease: [0.23, 1, 0.32, 1] }}
                      onClick={() => setSelectedMonth(isSelected ? null : month)}
                      className={cn(
                        "relative flex min-h-[70px] flex-col rounded-[var(--radius-control)] border p-2 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 active:scale-95 sm:min-h-[90px] sm:p-3",
                        isSelected
                          ? "border-fg bg-surface shadow-[var(--shadow-md)] ring-1 ring-fg z-10"
                          : active
                            ? pnl > 0
                              ? "border-profit/30 bg-profit/5 hover:border-profit/50"
                              : pnl < 0
                                ? "border-negative/30 bg-negative/5 hover:border-negative/50"
                                : "border-line bg-surface/50 hover:border-line-strong hover:bg-surface"
                            : "border-line bg-surface/50 hover:border-line-strong hover:bg-surface",
                      )}
                    >
                      <span className={cn("mb-1 text-xs font-bold uppercase tracking-widest text-fg-subtle")}>{label.slice(0, 3)}</span>
                      {active ? (
                        <div className="mt-auto w-full">
                          <div className={cn("truncate text-xs font-bold sm:text-sm", pnlTone(pnl))}>
                            <DisplayValue type="PNL" money={pnl} compact />
                          </div>
                          <div className="mt-0.5 hidden truncate text-[10px] text-fg-muted sm:block">
                            {tradeCount} trade{tradeCount > 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </div>"""

if old_monthly_grid in content:
    content = content.replace(old_monthly_grid, new_monthly_grid)
else:
    print("WARNING: Monthly grid not found")

with open('src/components/dashboard/calendar-view.tsx', 'w') as f:
    f.write(content)

