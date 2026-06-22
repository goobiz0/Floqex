"use client";

import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

/** "Hi, {name}" greeting with the real Clerk avatar, mirroring the reference header. */
export function Greeting({ subtitle, className }: { subtitle?: string; className?: string }) {
  const { user } = useUser();
  const first = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "there";
  const name =
    user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : first;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {user?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.imageUrl}
          alt={name}
          className="h-10 w-10 rounded-full object-cover ring-1 ring-line"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
          {first.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Hi, {first}</h1>
        {subtitle ? <p className="truncate text-sm text-fg-subtle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
