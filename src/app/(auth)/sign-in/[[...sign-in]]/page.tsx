import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <div className="w-full max-w-[26rem]">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Sign in to pick up where your bot left off.
        </p>
      </div>
      <SignIn />
    </div>
  );
}
