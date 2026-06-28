"use client";

import { useReportWebVitals } from "next/web-vitals";

// Lightweight, privacy-respecting Web Vitals reporter. No third-party tracker:
// metrics are logged to the console in development so LCP/INP/CLS regressions
// are visible while iterating, and, when NEXT_PUBLIC_VITALS_ENDPOINT is set,
// posted there via sendBeacon for first-party aggregation.
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[web-vital] ${metric.name}: ${Math.round(metric.value)} (${metric.rating ?? "n/a"})`
      );
    }

    const endpoint = process.env.NEXT_PUBLIC_VITALS_ENDPOINT;
    if (endpoint && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const body = JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          path: window.location.pathname,
        });
        navigator.sendBeacon(endpoint, body);
      } catch {
        // Never let telemetry break the page.
      }
    }
  });

  return null;
}
