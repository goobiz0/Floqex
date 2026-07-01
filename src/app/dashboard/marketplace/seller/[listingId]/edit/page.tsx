import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { EditListingForm } from "./client-form";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Edit Listing | Floqex Marketplace",
};

export default async function EditListingPage(props: { params: Promise<{ listingId: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const params = await props.params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: params.listingId, sellerId: user.id },
  });

  if (!listing) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-12 pt-4">
      <header className="flex flex-col gap-2">
        <Link 
          href="/dashboard/marketplace/seller" 
          className="flex w-fit items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <CaretLeft weight="bold" />
          Back to Seller Dashboard
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-3xl font-medium tracking-tight text-fg">Edit Listing</h1>
          <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-medium ${
            listing.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
            listing.status === 'PAUSED' ? 'bg-yellow-500/10 text-yellow-500' :
            'bg-muted text-muted-foreground'
          }`}>
            {listing.status}
          </span>
        </div>
        <p className="text-fg-muted">
          Update your strategy details or change its visibility on the marketplace.
        </p>
      </header>

      <EditListingForm listing={listing} userPlan={user.plan} />
    </div>
  );
}
