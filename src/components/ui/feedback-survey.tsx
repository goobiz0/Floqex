"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { ThumbsUp, ThumbsDown, ChatCircleText, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface FeedbackSurveyProps {
  featureId: string;
  title?: string;
  className?: string;
}

const SURVEY_MAPPING: Record<string, string> = {
  "copy-trading": "019f1ffc-9c44-0000-fb84-00c3cbc2e9e8",
  "ai-strategy-builder": "019f1ffc-d903-0000-71f1-0a019e9920e6",
  "bot-creation": "019f1ffc-dc9b-0000-ca5a-675c05ce8422",
  "marketplace-listing": "019f1ffc-e0f2-0000-284d-e6d17073b4b0",
};

const MAX_CHARS = 500;

export function FeedbackSurvey({ 
  featureId, 
  title = "How is this feature working for you?", 
  className 
}: FeedbackSurveyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "hidden">("idle");

  useEffect(() => {
    // Prevent spam by checking if user already submitted feedback for this feature
    if (typeof window !== "undefined") {
      const hasSubmitted = localStorage.getItem(`floqex_survey_submitted_${featureId}`);
      if (hasSubmitted) {
        setStatus("hidden");
      }
    }
  }, [featureId]);

  const handleRating = (value: "positive" | "negative") => {
    setRating(value);
    if (!isOpen) setIsOpen(true);
  };

  const sanitizeInput = (input: string) => {
    // Basic sanitisation to prevent extremely long or malicious-looking inputs.
    // Limits length and removes zero-width invisible characters.
    return input.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().slice(0, MAX_CHARS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || status === "submitting") return;
    
    setStatus("submitting");

    const sanitizedComment = sanitizeInput(comment);
    const surveyId = SURVEY_MAPPING[featureId];

    if (surveyId) {
      posthog.capture("survey sent", {
        $survey_id: surveyId,
        $survey_name: featureId,
        $survey_response: rating === "positive" ? 5 : 1,
        $survey_response_1: sanitizedComment,
      });
    } else {
      posthog.capture("user_feedback", {
        feature: featureId,
        rating,
        comment: sanitizedComment,
        url: typeof window !== "undefined" ? window.location.href : "",
      });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(`floqex_survey_submitted_${featureId}`, "true");
    }

    setTimeout(() => {
      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    }, 400); // Artificial delay to give a sense of completion
  };

  if (status === "hidden" || (status === "success" && !isOpen)) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-[var(--radius-card)] border border-line bg-elevated p-4 sm:p-5", className)}
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 text-positive py-1"
          >
            <CheckCircle weight="fill" className="h-5 w-5" />
            <p className="text-sm font-medium">Feedback sent. Thanks for shaping Floqex!</p>
          </motion.div>
        ) : (
          <motion.div key="form" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h4 className="text-sm font-medium text-fg">{title}</h4>
              <div className="flex flex-wrap items-center gap-2">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 gap-2 rounded-[var(--radius-control)] px-4 transition-colors",
                      rating === "positive" 
                        ? "border-positive/30 bg-positive-soft text-positive hover:bg-positive/20 hover:text-positive" 
                        : "border-line text-fg-subtle hover:text-fg hover:border-fg-muted bg-surface"
                    )}
                    onClick={() => handleRating("positive")}
                  >
                    <ThumbsUp weight={rating === "positive" ? "fill" : "regular"} className="h-4 w-4" />
                    <span>Good</span>
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 gap-2 rounded-[var(--radius-control)] px-4 transition-colors",
                      rating === "negative" 
                        ? "border-negative/30 bg-negative-soft text-negative hover:bg-negative/20 hover:text-negative" 
                        : "border-line text-fg-subtle hover:text-fg hover:border-fg-muted bg-surface"
                    )}
                    onClick={() => handleRating("negative")}
                  >
                    <ThumbsDown weight={rating === "negative" ? "fill" : "regular"} className="h-4 w-4" />
                    <span>Issues</span>
                  </Button>
                </motion.div>
              </div>
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.form 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  onSubmit={handleSubmit} 
                  className="flex flex-col gap-3 overflow-hidden"
                >
                  <div className="pt-2">
                    <div className="relative">
                      <ChatCircleText className="absolute left-3 top-3 h-4 w-4 text-fg-muted" />
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={MAX_CHARS}
                        placeholder="Optional details..."
                        className="min-h-[80px] w-full rounded-[var(--radius-control)] border border-line bg-surface pl-9 pr-3 pt-2.5 pb-2.5 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none transition-colors"
                      />
                    </div>
                    <div className="mt-1 flex justify-end">
                      <span className={cn(
                        "text-[10px] font-medium transition-colors", 
                        comment.length >= MAX_CHARS ? "text-negative" : "text-fg-faint"
                      )}>
                        {comment.length} / {MAX_CHARS}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => { setIsOpen(false); setRating(null); }}
                      className="h-9 rounded-[var(--radius-control)] text-fg-subtle hover:text-fg"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!rating || status === "submitting"}
                      className="h-9 rounded-[var(--radius-control)] bg-accent text-[var(--color-on-accent)] hover:bg-accent/90 disabled:opacity-50"
                    >
                      {status === "submitting" ? "Sending..." : "Submit"}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
