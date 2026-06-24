import { redirect } from "next/navigation";
import { getTradeData } from "@/lib/queries";
import { CalendarView } from "@/components/dashboard/calendar-view";

export default async function CalendarPage(props: { searchParams: Promise<{ account?: string }> }) {
  const searchParams = await props.searchParams;
  const data = await getTradeData(searchParams?.account);

  if (!data.hasAccount) {
    redirect("/dashboard/accounts");
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Performance Calendar</h1>
        <p className="text-fg-muted mt-1 text-sm">Visualise your daily, monthly, and yearly profit and loss.</p>
      </div>

      <CalendarView summaries={data.summaries} trades={data.trades} />
    </div>
  );
}
