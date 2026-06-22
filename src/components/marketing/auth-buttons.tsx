"use client";

import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { authUrl, dashboardUrl } from "@/lib/urls";
import Link from "next/link";

export function AuthButtons() {
  const { isSignedIn } = useAuth();
  
  if (isSignedIn) {
    return (
      <Button href={dashboardUrl("/")} size="sm" className="rounded-full">
        Dashboard
      </Button>
    );
  }
  
  return (
    <>
      <Link 
        href={authUrl("/sign-in")} 
        className="hidden text-sm font-medium text-fg-subtle transition-colors hover:text-fg sm:block"
      >
        Sign in
      </Link>
      <Button href={authUrl("/sign-up")} size="sm" className="rounded-full">
        Get started
      </Button>
    </>
  );
}
