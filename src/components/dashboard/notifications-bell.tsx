"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { dashboardUrl } from "@/lib/urls";
import type { NotificationRow, AgentEventKind } from "@/lib/queries";

const KIND_COLOR: Record<AgentEventKind, string> = {
  INFO: "text-fg-subtle",
  SIGNAL: "text-accent",
  TRADE: "text-profit",
  RISK: "text-negative",
  NEWS: "text-warning",
  ADJUST: "text-accent",
};

const SEEN_KEY = "floqex:notifs:seen";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Bell + dropdown of real recent agent events, with a localStorage unread mark. */
export function NotificationsBell({ items }: { items: NotificationRow[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Mount-time read from localStorage. Starts at 0 on the server so the markup
  // matches during hydration, then syncs to the stored value on the client.
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot external store read
    if (raw) setSeen(Number(raw));
  }, []);

  const newest = items[0] ? new Date(items[0].t).getTime() : 0;
  const unread = items.filter((i) => new Date(i.t).getTime() > seen).length;

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next && newest) {
        localStorage.setItem(SEEN_KEY, String(newest));
        setSeen(newest);
      }
      return next;
    });
  }

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
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <Bell size={18} weight={unread > 0 ? "fill" : "regular"} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-base bg-accent" />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-[var(--radius-card)] border border-line bg-elevated shadow-[var(--shadow-lg)]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top right" }}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-fg">Activity</p>
              <span className="text-xs text-fg-faint">{items.length}</span>
            </div>
            {items.length ? (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "text-[0.65rem] font-medium uppercase tracking-wide",
                          KIND_COLOR[n.kind] ?? KIND_COLOR.INFO,
                        )}
                      >
                        {n.kind.toLowerCase()}
                      </span>
                      <span className="shrink-0 text-[0.7rem] text-fg-faint">{relTime(n.t)}</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-fg-muted">{n.message}</p>
                    {n.account ? (
                      <p className="mt-0.5 text-xs text-fg-faint">{n.account}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-fg-muted">No activity yet</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  Your bot&apos;s decisions show up here once it trades.
                </p>
              </div>
            )}
            <Link
              href={dashboardUrl("/")}
              onClick={() => setOpen(false)}
              className="block border-t border-line px-4 py-2.5 text-center text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              View dashboard
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
