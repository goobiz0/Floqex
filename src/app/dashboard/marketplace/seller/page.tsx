import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { canListStrategies } from "@/lib/marketplace";

export default async function SellerDashboard() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !canListStrategies(user.plan)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Lock className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-medium tracking-tight">Pro Feature</h2>
        <p className="text-muted-foreground max-w-md">
          Selling strategies on the marketplace requires a Pro or Elite plan. 
          Upgrade your account to start monetizing your algorithmic edges.
        </p>
        <Button href="/dashboard/billing" className="mt-4">
          Upgrade Plan
        </Button>
      </div>
    );
  }

  const listings = await prisma.marketplaceListing.findMany({
    where: { sellerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const totalSalesCount = listings.reduce((acc, l) => acc + l.salesCount, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">Seller Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and earnings.</p>
        </div>
        <Button href="/dashboard/marketplace/seller/new" className="bg-emerald-500 hover:bg-emerald-600 text-white">
          Create Listing
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Balance</h3>
          <div className="text-4xl font-medium font-mono">${Number(user.sellerBalance).toFixed(2)}</div>
          {Number(user.sellerBalance) >= 50 ? (
             // In a real app this would open a dialog to confirm payout email
             <form action={async () => {
                "use server";
                // Mock withdrawal action call
                // await requestWithdrawal(Number(user.sellerBalance), user.email);
             }}>
                <Button type="button" className="mt-4 w-full" variant="outline">Request Payout</Button>
             </form>
          ) : (
            <p className="text-xs text-muted-foreground mt-4">$50.00 minimum for withdrawal</p>
          )}
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
    </div>
  );
}
