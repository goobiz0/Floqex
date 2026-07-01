import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ComparisonLab } from "@/components/dashboard/comparison-lab";

export const metadata: Metadata = { title: "Compare Strategies" };

export default async function ComparePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <ComparisonLab />
    </div>
  );
}
