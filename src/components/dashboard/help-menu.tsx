"use client";

import { useEffect, useRef, useState } from "react";
import { Question, BookOpen, ShieldCheck, Warning, type Icon } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { marketingUrl } from "@/lib/urls";

type HelpLink = { label: string; href: string; icon: Icon };

const LINKS: HelpLink[] = [
  { label: "How it works", href: marketingUrl("/how-it-works"), icon: BookOpen },
  { label: "Security", href: marketingUrl("/security"), icon: ShieldCheck },
  { label: "Risk disclosure", href: marketingUrl("/risk-disclosure"), icon: Warning },
];

/** Help dropdown linking to the real marketing resource pages. */
export function HelpMenu() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Help and resources"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <Question size={18} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated p-1.5 shadow-[var(--shadow-lg)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top right" }}
          >
            {LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  className="flex items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  <Icon size={16} className="shrink-0 text-fg-subtle" />
                  {l.label}
                </a>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
