"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkle, MagicWand } from "@phosphor-icons/react";
import { runAiOptimization } from "@/app/dashboard/strategy/actions";
import { useSearchParams } from "next/navigation";

export function AIOptimizer({ activeAccountId }: { activeAccountId: string }) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const res = await runAiOptimization(activeAccountId);
      if (!res.ok) {
        setError(res.error || "Failed to run optimization");
      }
    } catch (e) {
      setError("An unexpected error occurred.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-accent/20 bg-accent/5 p-4 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
      <div>
        <h3 className="text-sm font-semibold text-accent flex items-center gap-2">
          <Sparkle weight="fill" />
          AI Strategy Optimizer
        </h3>
        <p className="text-xs text-fg-subtle mt-1 max-w-lg">
          Our machine learning engine can analyze your recent trades and autonomously propose 
          parameter adjustments to improve your Win Rate and R-Multiple.
        </p>
        {error && <p className="text-xs text-negative mt-2">{error}</p>}
      </div>
      <Button 
        onClick={handleOptimize} 
        disabled={isOptimizing}
        className="shrink-0 gap-2 bg-accent hover:bg-accent/90 text-black shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]"
      >
        <MagicWand size={16} weight="fill" />
        {isOptimizing ? "Analyzing Markets..." : "Run AI Analysis"}
      </Button>
    </div>
  );
}
