import { MarketsExplorer } from "@/components/dashboard/markets-explorer";

export const metadata = { title: "Markets · Floqex" };

export default async function MarketsPage(props: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol } = await props.searchParams;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Markets</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Your bot&apos;s most-active instruments, plus live prices across Wall St, the ASX, and crypto.
        </p>
      </div>

      <MarketsExplorer initialSymbol={symbol ?? ""} />
    </div>
  );
}
