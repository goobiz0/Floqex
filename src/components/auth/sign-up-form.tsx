"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Envelope, Lock, User } from "@phosphor-icons/react";
import { useSignUp, useAuth, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { OtpInput } from "./otp-input";
import { Divider, clerkErrorMessage } from "./shared";
import { SocialButtons, type OAuthStrategy } from "./social-buttons";
import { dashboardUrl, onboardingUrl } from "@/lib/urls";
import { WaitlistForm } from "./waitlist-form";

export function SignUpForm() {
  const { signUp } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();
  
  const [desynced, setDesynced] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const rawSearch = typeof window !== 'undefined' ? window.location.search : '';
      const hasRedirectUrl = searchParams?.has("redirect_url") || new URLSearchParams(rawSearch).has("redirect_url");
      
      const lastAttempt = sessionStorage.getItem("floqex_auth_attempt");
      const isLooping = lastAttempt && Date.now() - parseInt(lastAttempt) < 3000;

      if (hasRedirectUrl || isLooping) {
        setDesynced(true);
        sessionStorage.removeItem("floqex_auth_attempt");
      } else {
        sessionStorage.setItem("floqex_auth_attempt", Date.now().toString());
        window.location.assign(dashboardUrl("/dashboard"));
      }
    }
  }, [isLoaded, isSignedIn, searchParams]);

  // Try to detect Waitlist mode from Clerk environment or local env var
  const env = (clerk as any)?.__unstable__environment;
  const isWaitlistEnabled = 
    env?.displayConfig?.waitlistEnabled === true || 
    env?.displayConfig?.waitlistMode === true || 
    process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

  const [step, setStep] = useState<"form" | "verify">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(signUp);

  if (desynced) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 text-center py-10 px-6 rounded-[var(--radius-container)] bg-negative/5 border border-negative/10">
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
          className="mt-2 bg-negative hover:bg-negative/90 text-white shadow-sm ring-1 ring-inset ring-black/10"
          onClick={() => signOut(() => window.location.assign("/sign-in"))}
        >
          Force sign out
        </Button>
      </div>
    );
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: createError } = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });
      if (createError) {
        setError(clerkErrorMessage(createError));
        setSubmitting(false);
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError(clerkErrorMessage(sendError));
        setSubmitting(false);
        return;
      }
      setStep("verify");
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) {
        setError(clerkErrorMessage(verifyError));
        setSubmitting(false);
        return;
      }
      
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => window.location.assign(onboardingUrl())
        });
        return;
      }
      
      console.warn("Unhandled Clerk signUp status:", signUp.status, signUp);
      setError(`Verification completed but account is incomplete. Missing fields: ${signUp.missingFields?.join(", ")}`);
      setSubmitting(false);
    } catch (err) {
      setError(clerkErrorMessage(err));
      setSubmitting(false);
    }
  }

  async function onOAuth(strategy: OAuthStrategy) {
    if (!signUp || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: ssoError } = await signUp.sso({
        strategy,
        redirectUrl: dashboardUrl("/dashboard"),
        redirectCallbackUrl: "/sso-callback",
      });
      if (ssoError) setError(clerkErrorMessage(ssoError));
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isWaitlistEnabled) {
    return <WaitlistForm />;
  }

  if (step === "verify") {
    return (
      <form onSubmit={onVerify} className="space-y-5" noValidate>
        <p className="text-sm text-fg-muted">
          Enter the 6-digit code we sent to <span className="text-fg">{email}</span>.
        </p>
        <OtpInput value={code} onChange={setCode} disabled={submitting} />
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
          {submitting ? "Verifying…" : "Verify email"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setStep("form");
            setCode("");
            setError(null);
          }}
          className="text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <SocialButtons onSelect={onOAuth} disabled={!ready || submitting} />
      <Divider>or sign up with email</Divider>
      <form onSubmit={onCreate} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name">
            <Input
              id="firstName"
              autoComplete="given-name"
              required
              icon={<User />}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field id="lastName" label="Last name">
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              icon={<User />}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Field>
        </div>
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
        <Field id="password" label="Password" hint="At least 8 characters.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            icon={<Lock />}
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
        {/* Clerk Smart CAPTCHA mounts here (required for custom sign-up flows). */}
        <div id="clerk-captcha" />
        <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
