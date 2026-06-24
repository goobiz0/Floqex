"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function IdleTimeout() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        signOut(() => router.push("/sign-in"));
      }, IDLE_TIMEOUT_MS);
    };

    // Set initial timeout
    handleActivity();

    // Listen to events
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [signOut, router]);

  return null;
}
