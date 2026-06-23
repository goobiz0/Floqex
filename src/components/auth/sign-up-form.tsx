"use client";

import { useState, type FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const { signOut } = useAuth();
  
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !isRedirecting) {
      setIsRedirecting(true);
      window.location.href = "/dashboard";
    }
  }, [isLoaded, isSignedIn, isRedirecting]);

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

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center py-8">
        <p className="text-fg font-medium">It looks like your session is out of sync with the server.</p>
        <Button 
          variant="secondary" 
          onClick={() => signOut(() => window.location.assign("/sign-in"))}
        >
          Sign out to fix this
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
          navigate: () => router.push("/onboarding")
        });
        return;
      }
      setError("Verification could not be completed. Please try again.");
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
        redirectUrl: dashboardUrl(),
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
