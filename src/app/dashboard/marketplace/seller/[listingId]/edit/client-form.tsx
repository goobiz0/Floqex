"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { updateListingDetails, updateListingStatus } from "../../../actions";
import { CaretDown, CurrencyDollar, Hash, ListDashes, Tag, TextAa, Textbox, Play, Pause, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function EditListingForm({ listing, userPlan }: { listing: any, userPlan: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const action = (formData: FormData) => {
    setError(null);
    const title = formData.get("title") as string;
    const desc = formData.get("description") as string;
    const price = Number(formData.get("priceUsd"));

    if (title.length < 5 || title.length > 100) {
      setError("Title must be between 5 and 100 characters.");
      return;
    }
    if (desc.length < 20 || desc.length > 5000) {
      setError("Description must be between 20 and 5000 characters.");
      return;
    }
    if (userPlan === "FREE" && price > 0) {
      setError("Free users can only list free strategies.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateListingDetails(listing.id, formData);
        if (result?.error) {
          setError(result.error);
        } else {
          toast.success("Listing updated successfully");
        }
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err.message || "Failed to update listing.");
      }
    });
  };

  const handleStatusToggle = () => {
    startTransition(async () => {
      try {
        const newStatus = listing.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
        const result = await updateListingStatus(listing.id, newStatus);
        if (result?.error) {
          toast.error("Failed to update status", { description: result.error });
        } else {
          toast.success(`Listing ${newStatus.toLowerCase()}`);
        }
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        toast.error("Failed to update status", { description: err.message });
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="p-8">
        <form action={action} className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-2">
            <h2 className="text-xl font-medium tracking-tight">Details</h2>
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {error && (
            <div className="rounded-[var(--radius-control)] border border-negative bg-negative-soft p-3 text-sm text-negative shadow-[var(--shadow-sm)]">
              {error}
            </div>
          )}

          <Field id="title" label="Listing Title" hint="A catchy, clear name for your strategy.">
            <Input
              id="title"
              name="title"
              required
              minLength={5}
              maxLength={100}
              defaultValue={listing.title}
              icon={<TextAa />}
            />
          </Field>

          <Field id="tagline" label="Tagline (Optional)" hint="A short sentence describing the edge.">
            <Input
              id="tagline"
              name="tagline"
              maxLength={200}
              defaultValue={listing.tagline || ""}
              icon={<Tag />}
            />
          </Field>

          <Field id="category" label="Category">
            <div className="relative">
              <select
                id="category"
                name="category"
                defaultValue={listing.category}
                required
                className="h-10 w-full appearance-none rounded-[var(--radius-control)] border border-line bg-surface pl-10 pr-9 text-sm text-fg shadow-[var(--shadow-sm)] transition-all duration-200 ease-[var(--ease-out)] focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)] disabled:pointer-events-none disabled:opacity-50"
              >
                <option value="Breakout">Breakout</option>
                <option value="Reversion">Reversion</option>
                <option value="Momentum">Momentum</option>
                <option value="Trend">Trend</option>
                <option value="Volatility">Volatility</option>
                <option value="Scalp">Scalp</option>
              </select>
              <ListDashes className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-fg-muted" />
              <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-fg-subtle" />
            </div>
          </Field>

          <Field id="priceUsd" label="Price (USD)" hint={userPlan === "FREE" ? "Free plan users can only list free strategies ($0)." : "One-time purchase price (between $0 and $999)."}>
            <Input
              id="priceUsd"
              name="priceUsd"
              type="number"
              step="1"
              min={0}
              max={userPlan === "FREE" ? 0 : 999}
              required
              defaultValue={Number(listing.priceUsd)}
              icon={<CurrencyDollar />}
              disabled={userPlan === "FREE"}
            />
          </Field>

          <Field id="description" label="Detailed Description">
            <div className="relative">
              <Textbox className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-fg-muted" />
              <textarea
                id="description"
                name="description"
                rows={8}
                required
                minLength={20}
                maxLength={5000}
                defaultValue={listing.description}
                className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface py-2 pl-10 pr-3 text-sm text-fg shadow-[var(--shadow-sm)] transition-all duration-200 ease-[var(--ease-out)] focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)]"
              />
            </div>
          </Field>
        </form>
      </Card>

      <Card className="p-8 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h2 className="text-xl font-medium tracking-tight">Visibility</h2>
            <Button 
              variant="primary" 
              onClick={handleStatusToggle} 
              disabled={isPending}
              className={listing.status === "ACTIVE" ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-emerald-500 hover:bg-emerald-600 text-black"}
            >
              {listing.status === "ACTIVE" ? (
                <><Pause weight="fill" className="mr-2" /> Pause Listing</>
              ) : (
                <><Play weight="fill" className="mr-2" /> Publish to Marketplace</>
              )}
            </Button>
          </div>
          <p className="text-sm text-fg-muted">
            {listing.status === "ACTIVE" 
              ? "Your listing is live on the marketplace. Pausing it will hide it from new buyers, but existing buyers will retain access." 
              : "Your listing is currently hidden from the marketplace. Ensure you have baked the stats via a backtest validation before publishing."}
          </p>
          {listing.edgeScore == null && (
            <div className="mt-2 flex items-start gap-3 p-4 rounded-lg bg-surface border border-line">
              <WarningCircle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
              <div className="text-sm">
                <span className="font-medium text-fg">Missing Performance Stats</span>
                <p className="text-fg-muted mt-1">You must run a backtest on this strategy to generate its Edge Score before it can be activated.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
