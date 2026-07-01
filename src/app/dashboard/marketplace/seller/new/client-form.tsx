"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { createListing } from "../../actions";
import { CaretDown, CurrencyDollar, Hash, ListDashes, Tag, TextAa, Textbox } from "@phosphor-icons/react";
import { FeedbackSurvey } from "@/components/ui/feedback-survey";

export function CreateListingForm({ strategies, userPlan }: { strategies: { id: string; name: string }[], userPlan: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const action = (formData: FormData) => {
    setError(null);
    
    // Client-side validation matching the schema
    const title = formData.get("title") as string;
    const desc = formData.get("description") as string;
    const price = Number(formData.get("priceUsd"));

    if (!formData.get("strategyId")) {
      setError("Please select a strategy to list.");
      return;
    }
    if (title.length < 5 || title.length > 100) {
      setError("Title must be between 5 and 100 characters.");
      return;
    }
    if (desc.length < 20 || desc.length > 5000) {
      setError("Description must be between 20 and 5000 characters.");
      return;
    }
    if (userPlan === "FREE") {
      if (price > 0) {
        setError("Free users can only list free strategies. Upgrade to sell.");
        return;
      }
    } else {
      if (price < 0 || price > 999) {
        setError("Price must be between $0 and $999.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = await createListing(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err.message || "Failed to create listing.");
      }
    });
  };

  return (
    <>
    <Card className="p-8">
      <form action={action} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-[var(--radius-control)] border border-negative bg-negative-soft p-3 text-sm text-negative shadow-[var(--shadow-sm)]">
            {error}
          </div>
        )}

        <Field id="strategyId" label="Strategy">
          <div className="relative">
            <select
              id="strategyId"
              name="strategyId"
              defaultValue=""
              required
              className="h-10 w-full appearance-none rounded-[var(--radius-control)] border border-line bg-surface pl-10 pr-9 text-sm text-fg shadow-[var(--shadow-sm)] transition-all duration-200 ease-[var(--ease-out)] focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)] disabled:pointer-events-none disabled:opacity-50"
            >
              <option value="" disabled>Select a strategy</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Hash className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-fg-muted" />
            <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-fg-subtle" />
          </div>
        </Field>

        <Field id="title" label="Listing Title" hint="A catchy, clear name for your strategy.">
          <Input
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={100}
            placeholder="e.g. BTC Breakout Momentum"
            icon={<TextAa />}
          />
        </Field>

        <Field id="tagline" label="Tagline (Optional)" hint="A short sentence describing the edge.">
          <Input
            id="tagline"
            name="tagline"
            maxLength={200}
            placeholder="e.g. Captures early momentum in highly volatile sessions."
            icon={<Tag />}
          />
        </Field>

        <Field id="category" label="Category">
          <div className="relative">
            <select
              id="category"
              name="category"
              defaultValue="Breakout"
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
            placeholder={userPlan === "FREE" ? "0" : "99"}
            icon={<CurrencyDollar />}
            disabled={userPlan === "FREE"}
            defaultValue={userPlan === "FREE" ? 0 : undefined}
          />
        </Field>

        <Field id="description" label="Detailed Description" hint="Explain how the strategy works, ideal market conditions, and risks.">
          <div className="relative">
            <Textbox className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-fg-muted" />
            <textarea
              id="description"
              name="description"
              rows={6}
              required
              minLength={20}
              maxLength={5000}
              placeholder="Describe the mechanics of your edge..."
              className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface py-2 pl-10 pr-3 text-sm text-fg shadow-[var(--shadow-sm)] transition-all duration-200 ease-[var(--ease-out)] placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)]"
            />
          </div>
        </Field>

        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Creating..." : "Create Draft"}
          </Button>
        </div>
      </form>
    </Card>
    
    <div className="mt-8">
      <FeedbackSurvey featureId="marketplace-listing" title="Is the listing process straightforward?" />
    </div>
    </>
  );
}
