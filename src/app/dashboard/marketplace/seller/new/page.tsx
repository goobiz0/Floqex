import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CreateListingForm } from "./client-form";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Create Listing | Floqex Marketplace",
};

export default async function NewListingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const strategies = await prisma.strategy.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, kind: true },
    orderBy: { createdAt: "desc" },
  });

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
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-fg">Create Listing</h1>
        <p className="text-fg-muted">
          List your strategy on the marketplace. You can set it to active after its edge score is validated.
        </p>
      </header>

      <CreateListingForm strategies={strategies} userPlan={user.plan} />
    </div>
  );
}
