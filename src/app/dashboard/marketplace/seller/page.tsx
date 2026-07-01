import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { WithdrawalForm } from "./withdrawal-form";

export default async function SellerDashboard() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
     return null;
  }

  const listings = await prisma.marketplaceListing.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const recentSales = await prisma.marketplacePurchase.findMany({
    where: { 
      status: "COMPLETED",
      listing: { sellerId: user.id }
    },
    include: {
      listing: { select: { title: true } },
      buyer: { select: { firstName: true, lastName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const totalSalesCount = listings.reduce((acc, l) => acc + l.salesCount, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and earnings.</p>
          {user.plan === "FREE" && (
            <p className="text-sm text-emerald-500">Free users can list strategies for $0. Upgrade to Pro to sell paid strategies.</p>
          )}
        </div>
        <Button href="/dashboard/marketplace/seller/new" variant="primary">
          Create Listing
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Balance</h3>
          <div className="text-4xl font-medium font-mono">${Number(user.sellerBalance).toFixed(2)}</div>
          <WithdrawalForm 
            balance={Number(user.sellerBalance)} 
            existingEmail={user.payoutEmail} 
          />
        </Card>
        
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Sales</h3>
          <div className="text-4xl font-medium">{totalSalesCount}</div>
        </Card>
        
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Listings</h3>
          <div className="text-4xl font-medium">{listings.filter(l => l.status === "ACTIVE").length}</div>
        </Card>
      </div>

      <section className="flex flex-col gap-4 mt-4">
        <h2 className="text-xl font-medium tracking-tight">Your Listings</h2>
        {listings.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-xl">
            <p className="text-muted-foreground mb-4">You haven't listed any strategies yet.</p>
            <Button href="/dashboard/marketplace/seller/new" variant="outline">
              Create your first listing
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map(listing => (
              <Card key={listing.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{listing.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${listing.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span>${Number(listing.priceUsd).toFixed(2)}</span>
                    <span>{listing.salesCount} sales</span>
                  </div>
                </div>
                <Button href={`/dashboard/marketplace/seller/${listing.id}/edit`} variant="secondary" size="sm">
                  Edit
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 mt-8">
        <h2 className="text-xl font-medium tracking-tight">Recent Sales</h2>
        {recentSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-[var(--radius-card)] bg-surface border border-line/50 gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-elevated border border-line mb-2">
              <span className="text-fg-muted font-mono text-lg">$</span>
            </div>
            <h3 className="text-lg font-medium tracking-tight text-fg">No sales yet</h3>
            <p className="text-fg-subtle max-w-sm text-center">
              Keep building and promoting your edges! Your recent transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-line overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-fg-muted uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Strategy</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium text-right">Net Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-elevated">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3 text-fg-subtle">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {sale.listing.title}
                    </td>
                    <td className="px-4 py-3 text-fg-subtle">
                      {sale.buyer.firstName || "Anonymous"} {sale.buyer.lastName || ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-500">
                      +${Number(sale.sellerEarningUsd).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
