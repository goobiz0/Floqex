import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { authUrl, appUrl } from "@/lib/urls";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect(appUrl("/dashboard"));

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
