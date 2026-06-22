"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { dashboardUrl } from "@/lib/urls";

/** Avatar in the topbar, linking to the profile. Real Clerk user, never a stock egg. */
export function TopbarUser() {
  const { user } = useUser();
  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <Link
      href={dashboardUrl("/profile")}
      aria-label="Your profile"
      className="block rounded-full ring-1 ring-line transition-shadow hover:ring-line-strong"
    >
      {user?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.imageUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}
