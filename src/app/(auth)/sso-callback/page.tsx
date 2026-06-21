"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthenticateWithRedirectCallback />
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-sm text-fg-muted">Completing sign-in…</p>
    </div>
  );
}
