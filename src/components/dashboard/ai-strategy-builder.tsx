"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { FeedbackSurvey } from "@/components/ui/feedback-survey";

type StrategyAst = {
  name: string;
  direction: string;
  conditions: Array<{ indicator: string; operator: string; value: string | number }>;
  stopLossPct: number;
  targetRatio: number;
};

export default function StrategyBuilderPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [ast, setAst] = useState<StrategyAst | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setAst(null);
    try {
      const res = await fetch("/api/ai/compile-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setAst(data.ast as StrategyAst);
      posthog.capture("strategy_generated", {
        strategy_name: (data.ast as StrategyAst).name,
        direction: (data.ast as StrategyAst).direction,
      });
    } catch (e: unknown) {
      posthog.captureException(e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!ast) return;
    setLoading(true);
    try {
      const res = await fetch("/api/strategy/deploy-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ast.name,
          params: ast
        })
      });
      if (!res.ok) throw new Error("Failed to deploy");
      posthog.capture("strategy_deployed", {
        strategy_name: ast.name,
        direction: ast.direction,
      });
      router.push("/dashboard/strategy");
    } catch(e: unknown) {
      posthog.captureException(e);
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Strategy Builder</h1>
        <p className="text-fg-muted mt-1">Describe your trading rules in plain English.</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Buy when the price is greater than the 50 SMA and risk 1% per trade."
          className="w-full h-32 p-4 bg-surface border border-line rounded-[var(--radius-control)] focus:border-accent outline-none resize-none"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt}
          className="px-4 py-2 bg-accent text-[var(--color-on-accent)] rounded-[var(--radius-control)] font-medium disabled:opacity-50"
        >
          {loading ? "Compiling..." : "Compile to AST"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-negative-soft text-negative rounded-[var(--radius-card)]">
          {error}
        </div>
      )}

      {ast && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-elevated border border-line rounded-[var(--radius-card)] overflow-x-auto">
            <h3 className="font-medium mb-4">{ast.name}</h3>
            <pre className="text-sm font-mono text-fg-muted">{JSON.stringify(ast, null, 2)}</pre>
          </div>
          <button
            className="w-full px-4 py-2 bg-surface border border-line hover:bg-elevated transition-colors rounded-[var(--radius-control)] font-medium"
            onClick={handleDeploy}
            disabled={loading}
          >
            Deploy Strategy
          </button>
        </div>
      )}

      <div className="pt-8">
        <FeedbackSurvey featureId="ai-strategy-builder" title="Is the AI Strategy Builder producing accurate results?" />
      </div>
    </div>
  );
}
