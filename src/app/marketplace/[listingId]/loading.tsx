import { Card } from "@/components/ui/card";

export default function ListingLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-pulse">
      <div className="flex-1 flex flex-col gap-8 w-full">
        <header className="flex flex-col gap-4">
          <div className="h-6 w-24 bg-surface rounded-full"></div>
          <div className="h-10 w-3/4 bg-surface rounded-md"></div>
          <div className="h-6 w-2/3 bg-surface rounded-md"></div>
          
          <div className="flex items-center gap-4 mt-2">
            <div className="h-4 w-32 bg-surface rounded-md"></div>
            <div className="h-4 w-24 bg-surface rounded-md"></div>
            <div className="h-4 w-24 bg-surface rounded-md"></div>
          </div>
        </header>

        <section className="space-y-4">
          <div className="h-4 w-full bg-surface rounded-md"></div>
          <div className="h-4 w-full bg-surface rounded-md"></div>
          <div className="h-4 w-5/6 bg-surface rounded-md"></div>
          <div className="h-4 w-4/5 bg-surface rounded-md"></div>
          <div className="h-4 w-full bg-surface rounded-md"></div>
        </section>
      </div>

      <div className="w-full lg:w-[380px] shrink-0 sticky top-24">
        <Card className="p-6 flex flex-col gap-6 border-line bg-elevated/50">
          <div className="flex justify-between items-end">
            <div className="h-10 w-24 bg-surface rounded-md"></div>
            <div className="h-4 w-24 bg-surface rounded-md mb-1"></div>
          </div>
          
          <div className="flex flex-col gap-3 p-4 bg-surface/50 rounded-lg">
            <div className="h-4 w-32 bg-surface rounded-md"></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-8 w-16 bg-surface rounded-md mb-2"></div>
                <div className="h-4 w-20 bg-surface rounded-md"></div>
              </div>
              <div>
                <div className="h-8 w-16 bg-surface rounded-md mb-2"></div>
                <div className="h-4 w-20 bg-surface rounded-md"></div>
              </div>
            </div>
          </div>

          <div className="h-14 w-full bg-surface rounded-[var(--radius-button)]"></div>
          <div className="h-10 w-full bg-surface rounded-md mt-2 opacity-50"></div>
        </Card>
      </div>
    </div>
  );
}
