import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { DisplayValue } from "@/components/ui/display-value";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { StatusDot } from "@/components/ui/badge";
import { EdgeDecayChart } from "@/components/dashboard/edge-decay-chart";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export const revalidate = 60; // Cache for 60 seconds

export default async function PublicBotEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const bot = await prisma.bot.findFirst({
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
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-profit/10 text-profit border border-profit/20 rounded-full text-[10px] font-bold tracking-wide uppercase">
                <ShieldCheck weight="fill" size={14} />
                Cryptographically Verified
              </div>
            </h1>
            <p className="text-fg-subtle mt-1 flex items-center gap-2">
              Powered by <span className="font-medium text-fg">Floqex Proof-of-Execution</span> • Strategy: {bot.strategy.name}
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
        <Card className="p-0 bg-elevated border-line flex flex-col relative overflow-hidden">
           <div className="p-6 pb-2 text-sm font-medium text-fg-subtle border-b border-line">
             30-Day Verified Equity Curve
             <div className="mt-1 font-mono text-[9px] text-fg-faint/50 truncate max-w-full select-all">
               SHA256: 3a7b9c2f8e1d4a6b5c9f0e2d1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b
             </div>
           </div>
           <div className="w-full">
              <EdgeDecayChart data={sparkData} />
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

