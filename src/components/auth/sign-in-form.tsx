"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Divider, clerkErrorMessage } from "./shared";
import { SocialButtons, type OAuthStrategy } from "./social-buttons";
import { authUrl, dashboardUrl } from "@/lib/urls";

export function SignInForm() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (signIn.status === "complete") {
        await signIn.finalize();
        window.location.assign(dashboardUrl());
        return;
      }
      setError("Additional verification is required. Please check your email.");
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
      setSubmitting(false);
    }
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
