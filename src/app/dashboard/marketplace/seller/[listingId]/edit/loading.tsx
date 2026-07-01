import { Card } from "@/components/ui/card";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

export default function EditListingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-12 pt-4 animate-pulse">
      <header className="flex flex-col gap-2">
        <div className="flex w-fit items-center gap-1 text-sm text-fg-muted">
          <CaretLeft weight="bold" />
          Back to Seller Dashboard
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="h-8 w-48 bg-muted rounded-md" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-96 bg-muted rounded-md mt-1" />
      </header>

      <div className="flex flex-col gap-8">
        <Card className="p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-2">
              <div className="h-6 w-24 bg-muted rounded-md" />
              <div className="h-10 w-32 bg-muted rounded-md" />
            </div>

            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-muted rounded-md" />
                <div className={i === 4 ? "h-32 w-full bg-muted rounded-md" : "h-10 w-full bg-muted rounded-md"} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-8 border-emerald-500/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="h-6 w-24 bg-muted rounded-md" />
              <div className="h-10 w-48 bg-muted rounded-md" />
            </div>
            <div className="h-4 w-full bg-muted rounded-md" />
            <div className="h-4 w-2/3 bg-muted rounded-md" />
          </div>
        </Card>
      </div>
    </div>
  );
}
