"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { submitDocsFeedback } from "@/app/(docs)/docs/actions";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (isHelpful: boolean) => {
    setHelpful(isHelpful);
  };

  const handleSubmit = async () => {
    if (helpful === null) return;
    setIsSubmitting(true);
    await submitDocsFeedback({
      url: pathname ?? "",
      helpful,
      comments
    });
    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="mt-16 border-t border-line pt-8 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-500">
        <div className="h-12 w-12 rounded-full bg-positive/10 text-positive flex items-center justify-center">
          <CheckCircle size={24} weight="fill" />
        </div>
        <h3 className="text-lg font-semibold text-fg">Thank you for your feedback!</h3>
        <p className="text-sm text-fg-subtle">Your input helps us improve the documentation.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 border-t border-line pt-8">
      <h3 className="text-sm font-semibold text-fg mb-4">Was this page helpful?</h3>
      
      {helpful === null ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVote(true)}
            className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-2 text-sm font-medium text-fg-subtle transition-colors hover:border-positive hover:text-positive"
          >
            <ThumbsUp size={16} />
            Yes
          </button>
          <button
            onClick={() => handleVote(false)}
            className="flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-4 py-2 text-sm font-medium text-fg-subtle transition-colors hover:border-negative hover:text-negative"
          >
            <ThumbsDown size={16} />
            No
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            {helpful ? <ThumbsUp size={16} className="text-positive" weight="fill" /> : <ThumbsDown size={16} className="text-negative" weight="fill" />}
            {helpful ? "Glad to hear it!" : "Sorry about that."}
          </div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Anything else you'd like to add? (Optional)"
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none resize-none h-24"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
