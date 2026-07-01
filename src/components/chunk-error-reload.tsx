"use client";

import { useEffect } from "react";

// After a new deploy, a tab left open on the previous build still holds JS
// that references the old build's chunk hashes. Those chunks 404 against the
// new deployment (served as text/plain, so the browser refuses to execute
// them), which silently stalls hydration: the server-rendered shell (sidebar)
// shows, but nothing client-side ever renders. Detect that failure mode and
// force a single reload to pick up the current build instead of leaving the
// user on a dead page. The sessionStorage guard stops a reload loop if the
// deployment is genuinely broken.
const RELOAD_GUARD_KEY = "floqex:chunk-error-reload";

function isChunkLoadFailure(message: string | undefined | null) {
  if (!message) return false;
  return (
    /Loading chunk [\d\w-]+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /is not a valid JavaScript MIME type/i.test(message)
  );
}

function reloadOnce() {
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
}

export function ChunkErrorReload() {
  useEffect(() => {
    // A fresh, successful load clears the guard so a future stale-deploy
    // reload is allowed to happen again.
    sessionStorage.removeItem(RELOAD_GUARD_KEY);

    const handleError = (event: ErrorEvent | Event) => {
      // Uncaught JS errors (thrown ChunkLoadError, MIME-type rejections) carry
      // a message on the ErrorEvent.
      if ("message" in event && isChunkLoadFailure(event.message)) {
        reloadOnce();
        return;
      }
      // <script>/<link> tag load failures (the 404'd chunk itself) are
      // resource errors: no message, just a target element with a stale src.
      const target = event.target;
      if (target instanceof HTMLScriptElement && target.src.includes("/_next/static/")) {
        reloadOnce();
      } else if (target instanceof HTMLLinkElement && target.href.includes("/_next/static/")) {
        reloadOnce();
      }
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : reason?.message;
      if (isChunkLoadFailure(message)) reloadOnce();
    };

    // capture: true — resource load errors on <script>/<link> don't bubble.
    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
