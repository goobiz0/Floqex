import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { authUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start on paper in minutes. No card required."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={authUrl("/sign-in")}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
