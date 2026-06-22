"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Envelope, Lock } from "@phosphor-icons/react";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Divider, clerkErrorMessage } from "./shared";
import { SocialButtons, type OAuthStrategy } from "./social-buttons";
import { OtpInput } from "./otp-input";
import { authUrl, dashboardUrl } from "@/lib/urls";

type Step = "form" | "mfa" | "mfa-backup";

export function SignInForm() {
  const { signIn } = useSignIn();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(signIn);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await signIn.password({ identifier: email, password });
      if (signInError) {
        setError(clerkErrorMessage(signInError));
        setSubmitting(false);
        return;
      }
      
      if (signIn.status === "needs_second_factor") {
        setStep("mfa");
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        window.location.assign(dashboardUrl());
        return;
      }
      
      console.warn("Unhandled Clerk signIn status:", signIn.status, signIn);
      setError(`Additional verification is required. (Status: ${signIn.status})`);
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onVerifyMFA(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.mfa.verifyTOTP({ code });
      if (verifyError) {
        setError(clerkErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        window.location.assign(dashboardUrl());
        return;
      }
      
      setError("Additional verification is required.");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onVerifyBackupCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.mfa.verifyBackupCode({ code: backupCode });
      if (verifyError) {
        setError(clerkErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        window.location.assign(dashboardUrl());
        return;
      }
      
      setError("Additional verification is required.");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onOAuth(strategy: OAuthStrategy) {
    if (!signIn || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: ssoError } = await signIn.sso({
        strategy,
        redirectUrl: dashboardUrl(),
        redirectCallbackUrl: "/sso-callback",
      });
      if (ssoError) setError(clerkErrorMessage(ssoError));
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      if (error) setSubmitting(false);
    }
  }

  if (step === "mfa") {
    return (
      <form onSubmit={onVerifyMFA} className="space-y-5" noValidate>
        <p className="text-sm text-fg-muted">
          Enter the 6-digit code from your authenticator app.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="mfa-code">Authenticator code</Label>
          <OtpInput id="mfa-code" value={code} onChange={setCode} disabled={submitting} />
        </div>
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
          {submitting ? "Verifying…" : "Verify code"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep("mfa-backup");
            setCode("");
            setError(null);
          }}
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          Use a backup code
        </button>
      </form>
    );
  }

  if (step === "mfa-backup") {
    return (
      <form onSubmit={onVerifyBackupCode} className="space-y-5" noValidate>
        <p className="text-sm text-fg-muted">
          Enter one of your emergency recovery codes.
        </p>
        <Field id="backupCode" label="Backup code">
          <Input
            id="backupCode"
            type="text"
            required
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
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
          disabled={!ready || submitting || backupCode.length < 8}
        >
          {submitting ? "Verifying…" : "Verify backup code"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep("mfa");
            setBackupCode("");
            setError(null);
          }}
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          Use authenticator app
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <SocialButtons onSelect={onOAuth} disabled={!ready || submitting} />
      <Divider>or continue with email</Divider>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            icon={<Envelope />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field id="password" label="Password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            icon={<Lock />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <div className="flex justify-end">
          <Link
            href={authUrl("/forgot-password")}
            className="text-xs text-fg-subtle transition-colors hover:text-fg"
          >
            Forgot password?
          </Link>
        </div>
        {error ? (
          <p className="text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
