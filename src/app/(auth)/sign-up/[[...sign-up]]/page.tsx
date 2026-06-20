import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Create your account",
};

export default function SignUpPage() {
  return (
    <div className="w-full max-w-[26rem]">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Spin up a paper account and watch the bot trade in minutes.
        </p>
      </div>
      <SignUp />
    </div>
  );
}
