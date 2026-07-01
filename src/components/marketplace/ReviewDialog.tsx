"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textbox, Star } from "@phosphor-icons/react";
import { submitReview } from "@/app/marketplace/[listingId]/actions";
import { toast } from "sonner";

export function ReviewDialog({ 
  listingId, 
  isOpen, 
  onClose 
}: { 
  listingId: string; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function action(formData: FormData) {
    try {
      setIsSubmitting(true);
      const title = formData.get("title") as string;
      const body = formData.get("body") as string;

      if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
      if (!body) throw new Error("Review body is required");

      await submitReview(listingId, rating, title, body);
      toast.success("Review submitted successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Leave a Review">
      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-fg">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`transition-colors ${star <= rating ? "text-yellow-500" : "text-fg-muted hover:text-yellow-500/50"}`}
              >
                <Star weight={star <= rating ? "fill" : "regular"} size={24} />
              </button>
            ))}
          </div>
        </div>

        <Field id="title" label="Title (Optional)">
          <Input id="title" name="title" placeholder="Summary of your experience" />
        </Field>

        <Field id="body" label="Review">
          <div className="relative">
            <Textbox className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-fg-muted" />
            <textarea
              id="body"
              name="body"
              rows={4}
              required
              placeholder="What did you like or dislike about this strategy?"
              className="w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface py-2 pl-10 pr-3 text-sm text-fg shadow-[var(--shadow-sm)] transition-all duration-200 ease-[var(--ease-out)] placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-ring)]"
            />
          </div>
        </Field>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
