import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";

/**
 * "New Strategy" entry point on the hub. Routes into the full creation flow
 * (`view=new`) where the user first decides between a curated template and
 * authoring their own logic, then names and creates a brand-new strategy.
 */
export function NewStrategyButton() {
  return (
    <Link
      href="/dashboard/strategy?view=new"
      className="inline-flex items-center gap-2 px-4 py-2 bg-fg rounded-[var(--radius-pill)] text-sm font-bold text-base hover:bg-fg/90 transition-all hover:-translate-y-[1px] active:scale-[0.97]"
    >
      <Plus size={16} weight="bold" />
      New Strategy
    </Link>
  );
}
