"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Envelope, Lock } from "@phosphor-icons/react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Divider, FormError, clerkErrorMessage } from "./shared";
import { SocialButtons, type OAuthStrategy } from "./social-buttons";
import { OtpInput } from "./otp-input";
import { authUrl, dashboardUrl } from "@/lib/urls";

type Step = "form" | "mfa" | "mfa-backup" | "client-trust";

export function SignInForm() {
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();
  
  const [desynced, setDesynced] = useState(false);
  
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check Next.js state, raw browser state, AND a sessionStorage timestamp to completely bulletproof against Next.js cache loops
      const lastAttempt = sessionStorage.getItem("floqex_auth_attempt");
      const isLooping = lastAttempt && Date.now() - parseInt(lastAttempt) < 3000;
      
      if (isLooping) {
        // Intentional: surfaces the desync recovery UI when a cache loop is
        // detected after hydration (same pattern as the intro overlay).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDesynced(true);
        sessionStorage.removeItem("floqex_auth_attempt");
      } else {
        sessionStorage.setItem("floqex_auth_attempt", Date.now().toString());
        window.location.assign(dashboardUrl("/dashboard"));
      }
    }
  }, [isLoaded, isSignedIn, searchParams]);

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(signIn);

  if (desynced) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 text-center py-10 px-6 rounded-[var(--radius-card)] bg-negative/5 border border-negative/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-negative/10 text-negative ring-4 ring-negative/5">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-fg">Session Desync</h3>
          <p className="text-sm font-medium text-fg-subtle max-w-[260px] mx-auto leading-relaxed">
            Your secure session token needs to be regenerated. Please sign out and log back in.
          </p>
        </div>
        <Button
          className="mt-2 bg-negative hover:bg-negative/90 text-white shadow-[var(--shadow-sm)] ring-1 ring-inset ring-black/10"
          onClick={() => signOut(() => window.location.assign("/sign-in"))}
        >
          Force sign out
        </Button>
      </div>
    );
  }

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

      if (signIn.status === "needs_client_trust") {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          setError(clerkErrorMessage(sendError));
          setSubmitting(false);
          return;
        }
        setStep("client-trust");
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(dashboardUrl("/dashboard"));
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          }
        });
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
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(dashboardUrl("/dashboard"));
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          }
        });
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
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(dashboardUrl("/dashboard"));
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          }
        });
        return;
      }
      
      setError("Additional verification is required.");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onVerifyClientTrust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code });
      if (verifyError) {
        setError(clerkErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(dashboardUrl("/dashboard"));
            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          }
        });
        return;
      }
      
      setError(`Additional verification is required. (Status: ${signIn.status})`);
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
        redirectUrl: dashboardUrl("/dashboard"),
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
        {error ? <FormError>{error}</FormError> : null}
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
        {error ? <FormError>{error}</FormError> : null}
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

  if (step === "client-trust") {
    return (
      <form onSubmit={onVerifyClientTrust} className="space-y-5" noValidate>
        <p className="text-sm text-fg-muted">
          We noticed you&apos;re signing in from a new device. Please enter the verification code sent to your email.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="device-code">Verification code</Label>
          <OtpInput id="device-code" value={code} onChange={setCode} disabled={submitting} />
        </div>
        {error ? <FormError>{error}</FormError> : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!ready || submitting || code.length < 6}
        >
          {submitting ? "Verifying…" : "Verify device"}
        </Button>
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
            invalid={Boolean(error)}
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
            invalid={Boolean(error)}
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
        {error ? <FormError>{error}</FormError> : null}
        <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
