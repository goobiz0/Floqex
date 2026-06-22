"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { authUrl, dashboardUrl } from "@/lib/urls";
import { useAuth } from "@clerk/nextjs";

/** Mobile nav sheet for the marketing header (hidden at md+). */
export function MarketingMobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { isSignedIn } = useAuth();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-fg-muted transition-colors hover:bg-surface hover:text-fg"
      >
        {open ? <X size={20} /> : <List size={20} />}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 top-16 z-50 border-b border-line bg-elevated p-4"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              <nav className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-[var(--radius-control)] px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
                  {isSignedIn ? (
                    <Button href={dashboardUrl("/")} className="w-full">
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button href={authUrl("/sign-in")} variant="secondary" className="w-full">
                        Sign in
                      </Button>
                      <Button href={authUrl("/sign-up")} className="w-full">
                        Get started
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
