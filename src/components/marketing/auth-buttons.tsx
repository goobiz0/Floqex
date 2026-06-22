"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { authUrl, dashboardUrl } from "@/lib/urls";
import Link from "next/link";

export function AuthButtons() {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  
  if (isSignedIn) {
    return (
      <Button 
        onClick={(e) => {
          e.preventDefault();
          window.location.assign(clerk.buildUrlWithAuth(dashboardUrl("/")));
        }} 
        size="sm" 
        className="rounded-full cursor-pointer"
      >
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
