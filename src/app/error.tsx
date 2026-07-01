"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught:", error);

    // Automatically reload on chunk load errors (happens when an old client hits a new deploy)
    const isChunkError = 
      error.name === "ChunkLoadError" ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("text/plain");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("chunk-error-reload");
      const now = Date.now();
      
      // Only auto-reload if we haven't done so in the last 10 seconds
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("chunk-error-reload", String(now));
        window.location.reload();
        return;
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-base p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-negative/10 text-negative">
        <WarningCircle size={32} weight="fill" />
      </div>
      <h1 className="mb-2 text-2xl font-medium tracking-tight text-fg">
        Something went wrong
      </h1>
      <p className="mb-8 max-w-sm text-sm text-fg-muted">
        We encountered an unexpected error. Please try again or contact support if the problem persists.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.assign("/")} variant="secondary">
          Go Home
        </Button>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
