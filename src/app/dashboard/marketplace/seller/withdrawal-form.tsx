"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestWithdrawal } from "../actions";
import { toast } from "sonner";
import { EnvelopeSimple } from "@phosphor-icons/react";

export function WithdrawalForm({ balance, existingEmail }: { balance: number, existingEmail: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState(existingEmail || "");
  const [showEmailInput, setShowEmailInput] = useState(!existingEmail);

  const handleWithdrawal = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please provide a valid payout email address.");
      setShowEmailInput(true);
      return;
    }

    startTransition(async () => {
      try {
        const result = await requestWithdrawal(balance, email);
        if (result?.error) {
          toast.error("Failed to request withdrawal", { description: result.error });
        } else {
          toast.success("Withdrawal request submitted", {
            description: "We will process your payout within 2-3 business days."
          });
          setShowEmailInput(false);
        }
      } catch (err: any) {
        toast.error("Failed to request withdrawal", { description: err.message });
      }
    });
  };

  if (balance < 50) {
    return <p className="text-xs text-muted-foreground mt-4">$50.00 minimum for withdrawal</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {showEmailInput && (
        <Input 
          type="email" 
          placeholder="Payout PayPal/Stripe Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon={<EnvelopeSimple />}
        />
      )}
      {!showEmailInput && existingEmail && (
        <p className="text-xs text-fg-muted truncate">Payout to: {existingEmail}</p>
      )}
      <Button 
        onClick={handleWithdrawal} 
        disabled={isPending}
        variant="outline" 
        className="w-full"
      >
        {isPending ? "Requesting..." : "Request Payout"}
      </Button>
    </div>
  );
}
