import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { authUrl, dashboardUrl } from "@/lib/urls";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect(dashboardUrl("/"));

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where your bot left off."
      footer={
        <>
          New to Floqex?{" "}
          <Link
            href={authUrl("/sign-up")}
            className="font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
