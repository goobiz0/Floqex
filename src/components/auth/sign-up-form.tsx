"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Envelope, Lock, User } from "@phosphor-icons/react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { OtpInput } from "./otp-input";
import { Divider, clerkErrorMessage } from "./shared";
import { SocialButtons, type OAuthStrategy } from "./social-buttons";
import { dashboardUrl, onboardingUrl } from "@/lib/urls";

export function SignUpForm() {
  const { signUp } = useSignUp();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.assign(dashboardUrl());
    }
  }, [isLoaded, isSignedIn]);

  const [step, setStep] = useState<"form" | "verify">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = Boolean(signUp);

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
          navigate: ({ decorateUrl }) => window.location.assign(decorateUrl(onboardingUrl()))
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
