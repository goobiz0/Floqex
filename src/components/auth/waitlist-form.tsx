"use client";

import { useState, type FormEvent } from "react";
import { Envelope, CheckCircle } from "@phosphor-icons/react";
import { useWaitlist } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { clerkErrorMessage } from "./shared";
import { motion } from "motion/react";

export function WaitlistForm() {
  const { waitlist } = useWaitlist();
  const [emailAddress, setEmailAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const ready = Boolean(waitlist);

  async function onJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!waitlist || !emailAddress) return;
    
    setSubmitting(true);
    setError(null);
    try {
      // The join method registers the email to the Clerk Waitlist
      await waitlist.join({ emailAddress });
      setSuccess(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 py-8 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-positive/10 text-positive">
          <CheckCircle weight="fill" size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-medium tracking-tight text-fg">You're on the list!</h3>
          <p className="text-sm text-fg-muted">
            We've saved your spot. Keep an eye on <span className="font-medium text-fg">{emailAddress}</span> for updates.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-medium tracking-tight text-fg">Join the Waitlist</h2>
        <p className="text-sm text-fg-muted">
          Floqex is currently in private beta. Join the waitlist to get early access.
        </p>
      </div>
      
      <form onSubmit={onJoin} className="space-y-4" noValidate>
        <Field id="email" label="Email Address">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            icon={<Envelope />}
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        
        {error ? (
          <motion.p 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-negative" 
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}
        
        <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting || !emailAddress}>
          {submitting ? "Joining..." : "Join Waitlist"}
        </Button>
      </form>
    </div>
  );
}
