"use client";

import { useState, type FormEvent } from "react";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { OtpInput } from "./otp-input";
import { clerkErrorMessage } from "./shared";
import { dashboardUrl } from "@/lib/urls";

export function ForgotPasswordForm() {
  const { signIn } = useSignIn();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(signIn);

  async function onRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: createError } = await signIn.create({ identifier: email });
      if (createError) {
        setError(clerkErrorMessage(createError));
        setSubmitting(false);
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(clerkErrorMessage(sendError));
        setSubmitting(false);
        return;
      }
      setStep("reset");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (verifyError) {
        setError(clerkErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      if (submitError) {
        setError(clerkErrorMessage(submitError));
        setSubmitting(false);
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        window.location.assign(dashboardUrl());
        return;
      }
      setError("Could not reset your password. Please try again.");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={onReset} className="space-y-5" noValidate>
        <p className="text-sm text-fg-muted">
          Enter the code sent to <span className="text-fg">{email}</span> and choose a new password.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="reset-code">Verification code</Label>
          <OtpInput value={code} onChange={setCode} disabled={submitting} />
        </div>
        <Field id="newPassword" label="New password" hint="At least 8 characters.">
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error ? (
          <p className="text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!ready || submitting || code.length < 6}
        >
          {submitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onRequest} className="space-y-4" noValidate>
      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </Field>
      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting}>
        {submitting ? "Sending code…" : "Send reset code"}
      </Button>
    </form>
  );
}
