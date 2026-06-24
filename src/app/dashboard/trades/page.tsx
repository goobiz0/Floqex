import { redirect } from "next/navigation";
import { getTradeData } from "@/lib/queries";
import { TradesTable } from "@/components/dashboard/trades-table";

export default async function TradesPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getTradeData(searchParams?.account);

  if (!data.hasAccount) {
    redirect("/dashboard/accounts");
  }

  const { trades } = data;

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Trade History</h1>
        <p className="text-fg-muted mt-1 text-sm">Every execution across your active strategies.</p>
      </div>

      <TradesTable trades={trades} />
    </div>
  );
}
