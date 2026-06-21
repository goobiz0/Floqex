import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { authUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a code to set a new one."
      footer={
        <Link
          href={authUrl("/sign-in")}
          className="font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
