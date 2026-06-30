/** Minimal className joiner. Filters falsy values and joins with spaces. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a number as a USD currency string with tabular alignment in mind. */
export function formatUSD(value: number, opts?: { sign?: boolean; compact?: boolean }): string {
  const sign = opts?.sign && value > 0 ? "+" : "";
  return (
    sign +
    value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: opts?.compact ? 0 : 2,
      maximumFractionDigits: opts?.compact ? 1 : 2,
      notation: opts?.compact ? "compact" : "standard",
    })
  );
}

/** Format a signed percentage, e.g. +1.84%. */
export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
