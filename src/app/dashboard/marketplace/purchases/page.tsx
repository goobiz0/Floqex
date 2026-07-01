import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@/lib/utils";
import { ShoppingBag, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "My Purchases | Floqex Marketplace",
};

export default async function PurchasesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const purchases = await prisma.marketplacePurchase.findMany({
    where: { 
      buyerId: user.id,
      status: "COMPLETED" 
    },
    include: {
      listing: {
        include: {
          strategy: {
            select: { name: true }
          },
          seller: {
            select: { firstName: true, lastName: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-medium tracking-tight">My Purchases</h1>
          <p className="text-muted-foreground text-lg">
            Manage and access the premium strategies you've acquired.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <Link 
            href="/dashboard/marketplace"
            className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-surface border border-line px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-elevated"
          >
            Browse Marketplace
          </Link>
        </div>
      </header>

      {purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 rounded-[var(--radius-card)] bg-surface border border-line/50 gap-4 mt-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-elevated border border-line mb-2">
            <ShoppingBag className="w-8 h-8 text-fg-muted" />
          </div>
          <h3 className="text-xl font-medium tracking-tight text-fg">No purchases yet</h3>
          <p className="text-fg-subtle max-w-sm text-center mb-2">
            You haven't bought any strategies from the marketplace. Head over to the marketplace to discover algorithmic edges.
          </p>
          <Link 
            href="/dashboard/marketplace"
            className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-fg px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:scale-[0.98] active:scale-95"
          >
            Explore strategies
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {purchases.map((purchase) => {
            const { listing } = purchase;
            return (
              <Card key={purchase.id} className="flex flex-col h-full overflow-hidden">
                <div className="p-6 flex flex-col flex-1 gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <Badge tone="neutral" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {listing.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mt-2">
                    <h3 className="font-semibold text-lg tracking-tight text-fg">
                      {listing.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      By {listing.seller.firstName || "Anonymous"} {listing.seller.lastName || ""}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">
                      Paid: {Number(purchase.priceUsd) === 0 ? "Free" : formatUSD(Number(purchase.priceUsd))}
                    </span>
                    
                    <Link 
                      href={`/dashboard/marketplace/${listing.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      View Strategy <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
