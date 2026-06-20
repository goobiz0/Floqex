import type { Metadata } from "next";
import { StrategyLab } from "@/components/dashboard/strategy-lab";

export const metadata: Metadata = { title: "Strategy Lab" };

export default function StrategyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">
          Strategy Lab
        </h1>
        <p className="text-sm text-fg-subtle">
          Tune the rules within safe bounds. Every change is logged.
        </p>
      </div>
      <StrategyLab />
    </div>
  );
}
