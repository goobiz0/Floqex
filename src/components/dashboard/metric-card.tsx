import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p
        className={cn(
          "tnum mt-2 text-xl font-semibold tracking-tight",
          tone === "positive" && "text-profit",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
    </Card>
  );
}
