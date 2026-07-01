"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize if we're in the browser and have a token
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
    
    if (typeof window !== "undefined" && token && !posthog.__loaded) {
      posthog.init(token, {
        api_host: host,
        capture_pageview: false, // Pageviews are usually handled automatically in app router via a different approach, or we just rely on autocapture.
        autocapture: true,
      });
    }
  }, []);

  return <>{children}</>;
}
