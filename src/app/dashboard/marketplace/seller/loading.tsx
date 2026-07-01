import { Card } from "@/components/ui/card";

export default function SellerLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <header className="flex justify-between items-end gap-4">
        <div className="flex flex-col gap-3">
          <div className="h-8 w-48 bg-muted rounded-md" />
          <div className="h-4 w-64 bg-muted rounded-md" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-md" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 flex flex-col gap-4">
            <div className="h-4 w-24 bg-muted rounded-md" />
            <div className="h-10 w-32 bg-muted rounded-md" />
            {i === 1 && <div className="h-10 w-full bg-muted rounded-md mt-2" />}
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-4 mt-4">
        <div className="h-6 w-32 bg-muted rounded-md mb-2" />
        {[1, 2].map((i) => (
          <Card key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-5 w-48 bg-muted rounded-md" />
              <div className="h-4 w-24 bg-muted rounded-md" />
            </div>
            <div className="h-8 w-16 bg-muted rounded-md" />
          </Card>
        ))}
      </section>
    </div>
  );
}
