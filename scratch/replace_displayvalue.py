import re

with open('src/components/dashboard/calendar-view.tsx', 'r') as f:
    content = f.read()

content = content.replace('<DisplayValue type="PNL" money={pnl} percent={summary.startBalance ? (pnl / summary.startBalance) * 100 : undefined} />', '<DisplayValue type="PNL" money={pnl} compact percent={summary.startBalance ? (pnl / summary.startBalance) * 100 : undefined} />')
content = content.replace('<DisplayValue type="PNL" money={selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl ?? 0), 0)} />', '<DisplayValue type="PNL" money={selectedDayTrades.reduce((acc, t) => acc + Number(t.netPnl ?? 0), 0)} compact />')
content = content.replace('<DisplayValue type="PNL" money={pnl} />', '<DisplayValue type="PNL" money={pnl} compact />')
content = content.replace('<DisplayValue type="PNL" money={yearTotal.pnl} />', '<DisplayValue type="PNL" money={yearTotal.pnl} compact />')
content = content.replace('<DisplayValue type="PNL" money={selectedMonthMeta.pnl} />', '<DisplayValue type="PNL" money={selectedMonthMeta.pnl} compact />')
content = content.replace('<DisplayValue type="PNL" money={d.pnl} percent={d.startBalance ? (d.pnl / d.startBalance) * 100 : undefined} />', '<DisplayValue type="PNL" money={d.pnl} compact percent={d.startBalance ? (d.pnl / d.startBalance) * 100 : undefined} />')
content = content.replace('<DisplayValue type="PNL" money={selectedYearMeta.pnl} />', '<DisplayValue type="PNL" money={selectedYearMeta.pnl} compact />')
content = content.replace('<DisplayValue type="PNL" money={m.pnl} />', '<DisplayValue type="PNL" money={m.pnl} compact />')

with open('src/components/dashboard/calendar-view.tsx', 'w') as f:
    f.write(content)

