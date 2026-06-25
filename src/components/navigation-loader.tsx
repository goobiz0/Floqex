"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LemniscateLoader } from "./lemniscate-loader";

export function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pathnameRef = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pathname actually changes, navigation completed — hide the loader
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      pathnameRef.current = pathname;
      setVisible(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Walk up from click target to find the nearest <a>
      const anchor = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";

      // Skip: external, hash-only, mailto/tel, new-tab, modifier keys
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;

      // Skip if this href resolves to the current pathname (same page)
      const resolved = new URL(href, window.location.href);
      if (resolved.pathname === pathnameRef.current) return;

      setVisible(true);

      // Safety valve: auto-hide after 8 s in case navigation stalls
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setVisible(false), 8000);
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nav-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            backgroundColor: "var(--color-base)",
          }}
          aria-live="polite"
          aria-label="Navigating"
        >
          {/* Ambient glow behind the lemniscate */}
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* The lemniscate animation */}
          <div
            style={{
              position: "relative",
              width: "min(28vmin, 148px)",
              aspectRatio: "1",
              color: "var(--color-accent)",
            }}
          >
            <LemniscateLoader />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
