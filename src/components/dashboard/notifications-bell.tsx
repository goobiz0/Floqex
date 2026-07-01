"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X, Check } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { dashboardUrl } from "@/lib/urls";
import type { NotificationItem } from "@/app/dashboard/notifications-actions";
import { markAsRead, clearAllNotifications, generateTestAlert } from "@/app/dashboard/notifications-actions";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  const unreadCount = items.filter((i) => !i.isRead).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
      >
        <Bell size={18} weight={unreadCount > 0 ? "fill" : "regular"} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-base bg-accent" />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-base/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            
            {/* Slide-out Drawer */}
            <motion.div
              role="dialog"
              aria-modal="true"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-line bg-elevated shadow-2xl flex flex-col"
              initial={reduce ? { x: "100%" } : { x: "100%", opacity: 0 }}
              animate={reduce ? { x: 0 } : { x: 0, opacity: 1 }}
              exit={reduce ? { x: "100%" } : { x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4 shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-fg">Alerts & Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-[var(--color-on-accent)]">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateTestAlert()}
                    className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    Test Alert
                  </button>
                  {items.length > 0 && (
                    <button
                      onClick={() => clearAllNotifications()}
                      className="text-xs font-medium text-fg-subtle hover:text-fg transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {items.length ? (
                  <ul className="divide-y divide-line">
                    {items.map((n) => (
                      <li key={n.id} className={cn("relative px-5 py-4 group", !n.isRead && "bg-accent-soft/10")}>
                        <div className="flex items-baseline justify-between gap-2 pr-6">
                          <span className={cn("text-[0.65rem] font-medium uppercase tracking-wide", !n.isRead ? "text-accent" : "text-fg-subtle")}>
                            {n.title}
                          </span>
                          <span className="shrink-0 text-[0.7rem] text-fg-faint">{relTime(n.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm leading-snug text-fg-muted">{n.message}</p>
                        
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-line"
                          >
                            <Check size={12} className="text-accent" /> Mark read
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                    <p className="text-sm font-medium text-fg-muted">No alerts</p>
                    <p className="mt-1 text-xs text-fg-subtle">
                      You are all caught up. New system alerts will appear here.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="shrink-0 border-t border-line p-4">
                <Link
                  href={dashboardUrl("/settings")}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-[var(--radius-control)] bg-surface py-2 text-center text-xs font-medium text-fg transition-colors hover:bg-surface/80"
                >
                  Notification settings
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
