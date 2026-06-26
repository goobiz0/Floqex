import type { Metadata } from "next";
import { getNavAccounts } from "@/lib/queries";
import { CalculatorsView } from "@/components/dashboard/calculators-view";

export const metadata: Metadata = { title: "Calculators" };

/** Sensible demo equity when no real account balance is available. */
const FALLBACK_BALANCE = 10_000;

export default async function CalculatorsPage(props: {
  searchParams: Promise<{ account?: string; calc?: string }>;
}) {
  const { account, calc } = await props.searchParams;

  // Pre-fill money inputs with the user's real active-account equity when we can
  // get it. Falls back to a clean demo figure, never a fabricated balance.
  const accounts = await getNavAccounts();
  const active = accounts.find((a) => a.id === account) ?? accounts[0];
  const defaultBalance = active && active.balance > 0 ? Math.round(active.balance) : FALLBACK_BALANCE;

  return (
    <CalculatorsView defaultBalance={defaultBalance} initialCalc={calc} />
  );
}
