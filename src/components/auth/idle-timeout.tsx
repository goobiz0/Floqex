"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Sign the user out after this much genuine inactivity. Kept generous on purpose:
// it is a security backstop for a truly abandoned browser, not a productivity
// tax. The previous 15-minute value booted active sessions during normal use,
// e.g. while reading charts without moving the mouse, or while a change was being
// committed/pushed/deployed (the app tab sits idle the whole time, so it looked
// like the redeploy logged you out when it was really this timer).
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

// Shared across tabs so activity in any tab keeps every tab signed in. signOut
// ends the Clerk session globally, so a single hidden tab must not boot a user
// who is actively working in another tab.
const ACTIVITY_KEY = "floqex:last-activity";
// Throttle cross-tab writes: mousemove fires constantly and localStorage writes
// are synchronous, so only persist every few seconds. Coarse granularity is fine
// against a 60-minute window.
const SHARED_WRITE_INTERVAL_MS = 10 * 1000;

export function IdleTimeout() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastActivity = Date.now();
    let lastSharedWrite = 0;
    let signedOut = false;

    const readShared = (): number => {
      try {
        const raw = window.localStorage.getItem(ACTIVITY_KEY);
        const parsed = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(parsed) ? parsed : 0;
      } catch {
        return 0;
      }
    };

    const writeShared = (ts: number) => {
      try {
        window.localStorage.setItem(ACTIVITY_KEY, String(ts));
      } catch {
        // localStorage may be unavailable (private mode, blocked storage); this
        // tab then falls back to its own in-memory timestamp.
      }
    };

    const doSignOut = () => {
      if (signedOut) return;
      signedOut = true;
      signOut(() => router.push("/sign-in"));
    };

    // Re-evaluate idleness against the newest activity from ANY tab. Only sign
    // out once the whole browser has been idle past the window; otherwise
    // reschedule for the time that's left. This also corrects for background
    // timer throttling, which can fire a stale timer late.
    const evaluate = () => {
      lastActivity = Math.max(lastActivity, readShared());
      const idleFor = Date.now() - lastActivity;
      clearTimeout(timeoutId);
      if (idleFor >= IDLE_TIMEOUT_MS) doSignOut();
      else timeoutId = setTimeout(evaluate, IDLE_TIMEOUT_MS - idleFor);
    };

    const handleActivity = () => {
      const t = Date.now();
      lastActivity = t;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(evaluate, IDLE_TIMEOUT_MS);
      if (t - lastSharedWrite > SHARED_WRITE_INTERVAL_MS) {
        lastSharedWrite = t;
        writeShared(t);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") evaluate();
    };

    // Activity broadcast from another tab: pick up the newer timestamp and
    // reschedule so this (possibly hidden) tab won't sign out while another is
    // in use.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) evaluate();
    };

    // Seed the shared timestamp and arm the initial timeout.
    lastActivity = Math.max(lastActivity, readShared());
    writeShared(lastActivity);
    lastSharedWrite = lastActivity;
    timeoutId = setTimeout(evaluate, IDLE_TIMEOUT_MS);

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [signOut, router]);

  return null;
}
