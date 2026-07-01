import { Card } from "@/components/ui/card";

export default function MarketplaceLoading() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse p-12 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-10 w-64 bg-surface rounded-md"></div>
          <div className="h-6 w-96 bg-surface rounded-md"></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="flex flex-col h-64 overflow-hidden border border-line bg-elevated/50 p-6 gap-4">
            <div className="flex justify-between items-start">
              <div className="h-6 w-20 bg-surface rounded-full"></div>
              <div className="h-6 w-16 bg-surface rounded-md"></div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-6 w-3/4 bg-surface rounded-md"></div>
              <div className="h-4 w-full bg-surface rounded-md"></div>
              <div className="h-4 w-5/6 bg-surface rounded-md"></div>
            </div>
            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
              <div className="h-4 w-24 bg-surface rounded-md"></div>
              <div className="h-4 w-12 bg-surface rounded-md"></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
