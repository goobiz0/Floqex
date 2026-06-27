"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Sign the user out after this much genuine inactivity. Kept generous on purpose:
// it is a security backstop for a truly abandoned tab, not a productivity tax.
// The previous 15-minute value booted active sessions during normal use, e.g.
// while reading charts without moving the mouse, or while a change was being
// committed/pushed/deployed (the app tab sits idle the whole time, so it looked
// like the redeploy logged you out when it was really this timer).
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

export function IdleTimeout() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastActivity = Date.now();
    let signedOut = false;

    const doSignOut = () => {
      if (signedOut) return;
      signedOut = true;
      signOut(() => router.push("/sign-in"));
    };

    const schedule = (delay: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(doSignOut, Math.max(0, delay));
    };

    const handleActivity = () => {
      lastActivity = Date.now();
      schedule(IDLE_TIMEOUT_MS);
    };

    // Background tabs fire no input events and throttle timers, so a timer armed
    // before the tab was hidden is unreliable. On return, measure real elapsed
    // time: sign out only if the session genuinely went idle past the window,
    // otherwise reschedule for the time that's left. This kills the premature
    // logout that booted you after a few minutes on another tab, without letting
    // a walked-away session live forever.
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= IDLE_TIMEOUT_MS) doSignOut();
      else schedule(IDLE_TIMEOUT_MS - idleFor);
    };

    // Arm the initial timeout.
    schedule(IDLE_TIMEOUT_MS);

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [signOut, router]);

  return null;
}
