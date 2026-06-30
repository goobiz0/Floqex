import re

with open('src/components/dashboard/calendar-view.tsx', 'r') as f:
    content = f.read()

# 1. Update yearlyGrid
old_yearlyGrid = """  const yearlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number; tradeCount: number }>();
    for (const s of summaries) {
      const y = s.date.slice(0, 4);
      const cur = map.get(y) ?? { pnl: 0, tradeCount: 0 };
      cur.pnl += Number(s.netPnl);
      cur.tradeCount += s.tradeCount;
      map.set(y, cur);
    }
    const cy = String(new Date().getFullYear());
    if (!map.has(cy)) map.set(cy, { pnl: 0, tradeCount: 0 });
    return Array.from(map.entries())
      .map(([yearStr, v]) => ({ yearStr, ...v }))
      .sort((a, b) => b.yearStr.localeCompare(a.yearStr));
  }, [summaries]);"""

new_yearlyGrid = """  const yearlyGrid = useMemo(() => {
    const map = new Map<string, { pnl: number; tradeCount: number }>();
    for (const s of summaries) {
      const y = s.date.slice(0, 4);
      const cur = map.get(y) ?? { pnl: 0, tradeCount: 0 };
      cur.pnl += Number(s.netPnl);
      cur.tradeCount += s.tradeCount;
      map.set(y, cur);
    }
    const cy = new Date().getFullYear();
    const grid = [];
    for (let i = 0; i < 12; i++) {
      const y = String(cy - i);
      grid.push({ yearStr: y, pnl: map.get(y)?.pnl ?? 0, tradeCount: map.get(y)?.tradeCount ?? 0 });
    }
    return grid;
  }, [summaries]);"""

content = content.replace(old_yearlyGrid, new_yearlyGrid)

# 2. Update shiftMonth disabled state
old_shiftMonth = """<button onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">"""
new_shiftMonth = """<button onClick={() => shiftMonth(1)} disabled={currentMonth.getFullYear() === new Date().getFullYear() && currentMonth.getMonth() === new Date().getMonth()} aria-label="Next month" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed">"""

content = content.replace(old_shiftMonth, new_shiftMonth)

# 3. Update shiftYear disabled state
old_shiftYear = """<button onClick={() => shiftYear(1)} aria-label="Next year" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg">"""
new_shiftYear = """<button onClick={() => shiftYear(1)} disabled={currentMonth.getFullYear() >= new Date().getFullYear()} aria-label="Next year" className="rounded-[var(--radius-pill)] p-1.5 text-fg-subtle transition-colors hover:bg-base hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed">"""

content = content.replace(old_shiftYear, new_shiftYear)


with open('src/components/dashboard/calendar-view.tsx', 'w') as f:
    f.write(content)

