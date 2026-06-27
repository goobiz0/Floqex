import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { DisplayValue } from "@/components/ui/display-value";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { StatusDot } from "@/components/ui/badge";

export const revalidate = 60; // Cache for 60 seconds

export default async function PublicBotEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const bot = await prisma.bot.findUnique({
    where: { id, isPublic: true },
    include: {
      account: {
        include: {
          summaries: {
            orderBy: { date: "asc" },
            take: 30, // Last 30 days
          }
        }
      },
      strategy: {
        select: { name: true, kind: true }
      }
    }
  });

  if (!bot || !bot.account) {
    notFound();
  }

  const summaries = bot.account.summaries;
  const balance = Number(bot.account.balance);
  const startBalance = summaries.length > 0 ? Number(summaries[0].startBalance) : balance;
  const totalPnl = balance - startBalance;
  const pnlPercent = (totalPnl / startBalance) * 100;

  const sparkData = summaries.map(s => Number(s.endBalance));
  if (sparkData.length === 0) sparkData.push(balance);

  const winCount = summaries.reduce((acc, s) => acc + s.winCount, 0);
  const lossCount = summaries.reduce((acc, s) => acc + s.lossCount, 0);
  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  return (
    <div className="min-h-screen bg-base text-fg p-4 md:p-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-3">
              {bot.name}
              <Badge tone="positive">VERIFIED</Badge>
            </h1>
            <p className="text-fg-subtle mt-1">
              Powered by <span className="font-medium text-fg">Floqex</span> • Strategy: {bot.strategy.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
             <span className="flex items-center gap-1.5 text-fg-muted font-medium">
               <StatusDot tone={bot.status === "RUNNING" ? "positive" : "neutral"} pulse={bot.status === "RUNNING"} />
               {bot.status === "RUNNING" ? "Live" : "Paused"}
             </span>
             <span className="text-xs text-fg-faint">Updated recently</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-elevated border-line">
            <p className="text-xs text-fg-subtle font-medium mb-1">Balance</p>
            <p className="text-xl font-bold tnum"><DisplayValue type="BALANCE" money={balance} /></p>
          </Card>
          <Card className="p-4 bg-elevated border-line">
            <p className="text-xs text-fg-subtle font-medium mb-1">Total Return</p>
            <p className={`text-xl font-bold tnum ${totalPnl >= 0 ? "text-profit" : "text-negative"}`}>
              <DisplayValue type="PNL" money={totalPnl} percent={pnlPercent} />
            </p>
          </Card>
          <Card className="p-4 bg-elevated border-line">
            <p className="text-xs text-fg-subtle font-medium mb-1">Win Rate</p>
            <p className="text-xl font-bold tnum">{winRate.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 bg-elevated border-line">
            <p className="text-xs text-fg-subtle font-medium mb-1">Trades (30d)</p>
            <p className="text-xl font-bold tnum">{totalTrades}</p>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-6 bg-elevated border-line h-64 flex flex-col justify-end relative overflow-hidden">
           <div className="absolute top-4 left-6 text-sm font-medium text-fg-subtle">30-Day Equity Curve</div>
           <div className="h-40 w-full mt-4">
              <Spark data={sparkData} />
           </div>
        </Card>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-[var(--radius-card)] border border-line-strong text-center">
           <h3 className="text-lg font-bold mb-2">Automate this strategy on your own account</h3>
           <p className="text-sm text-fg-subtle mb-6 max-w-md mx-auto">
             Floqex allows you to run this exact strategy on your own broker account. 
             Sign up to copy the logic and customize the risk parameters.
           </p>
           <Link 
             href="/sign-up" 
             target="_blank"
             className="h-10 px-6 inline-flex items-center justify-center bg-accent text-[var(--color-on-accent)] font-medium rounded-[var(--radius-control)] hover:opacity-90 transition-opacity"
           >
             Copy Strategy on Floqex
           </Link>
        </div>
        
      </div>
    </div>
  );
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-faint">Not enough data to graph</div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 95;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--color-profit)" : "var(--color-negative)"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
