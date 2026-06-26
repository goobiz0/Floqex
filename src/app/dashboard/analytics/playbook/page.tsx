import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { TradeChart } from "@/components/ui/trade-chart";

export default async function PlaybookPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      accounts: {
        include: {
          trades: {
            where: { status: "CLOSED" },
            orderBy: { closedAt: "desc" },
            take: 20
          }
        }
      }
    }
  });

  if (!user || !user.accounts[0]) {
    return <div>No account found</div>;
  }

  const trades = user.accounts[0].trades;

  // Mocking candlestick data around a trade for demonstration
  const generateMockData = (entryPrice: number, exitPrice: number, isLong: boolean) => {
    const data = [];
    let currentPrice = entryPrice - (isLong ? 10 : -10);
    const date = new Date();
    date.setDate(date.getDate() - 10);
    
    // Deterministic pseudo-random so the illustrative candles are stable across
    // renders (no hydration mismatch) without pulling in real data.
    const wobble = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x); // 0..1
    };
    for(let i = 0; i < 20; i++) {
      const open = currentPrice;
      const close = i === 10 ? entryPrice : (i === 15 ? exitPrice : currentPrice + (wobble(i) * 4 - 2));
      const high = Math.max(open, close) + wobble(i + 100) * 2;
      const low = Math.min(open, close) - wobble(i + 200) * 2;
      
      data.push({
        time: date.toISOString().split('T')[0],
        open, high, low, close
      });
      
      currentPrice = close;
      date.setDate(date.getDate() + 1);
    }
    return data;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">God Mode Playbook</h1>
        <p className="text-fg-muted mt-1">Deep visual review of your latest trades.</p>
      </div>

      {trades.length === 0 ? (
        <div className="p-8 text-center text-fg-muted bg-surface border border-line rounded-[var(--radius-card)]">
          No trades to display yet.
        </div>
      ) : (
        <div className="space-y-12">
          {trades.map((trade) => {
            const entryTime = new Date(trade.openedAt).toISOString().split('T')[0];
            // If closedAt is the same day, we just offset it visually by using a different date in the mock or same day
            const exitTime = trade.closedAt ? new Date(trade.closedAt).toISOString().split('T')[0] : entryTime;
            
            const mockData = generateMockData(Number(trade.entryPrice), Number(trade.exitPrice), trade.direction === "LONG");
            // Set exact times on the mock data to match the markers
            mockData[10].time = entryTime;
            if (mockData[15]) mockData[15].time = exitTime;

            return (
              <div key={trade.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-lg flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-[var(--radius-pill)] text-xs font-semibold ${trade.direction === 'LONG' ? 'bg-profit/10 text-profit' : 'bg-negative-soft text-negative'}`}>
                        {trade.direction}
                      </span>
                      {trade.instrument}
                    </h3>
                    <p className="text-sm text-fg-muted">
                      PnL: <span className={Number(trade.netPnl) > 0 ? "text-profit" : "text-negative"}>${Number(trade.netPnl).toFixed(2)}</span> ({Number(trade.rMultiple).toFixed(2)}R)
                    </p>
                  </div>
                  <div className="text-sm text-right text-fg-muted">
                    <p>Entry: {Number(trade.entryPrice).toFixed(2)}</p>
                    <p>Exit: {Number(trade.exitPrice).toFixed(2)}</p>
                  </div>
                </div>
                
                <TradeChart 
                  data={mockData.sort((a,b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime())}
                  entryTime={entryTime}
                  entryPrice={Number(trade.entryPrice)}
                  exitTime={exitTime}
                  exitPrice={Number(trade.exitPrice)}
                  direction={trade.direction as "LONG" | "SHORT"}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
