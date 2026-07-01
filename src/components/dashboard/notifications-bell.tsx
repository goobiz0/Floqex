"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, X, Check, Info, Warning } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { dashboardUrl } from "@/lib/urls";
import { useRef } from "react";
import type { NotificationItem } from "@/app/dashboard/notifications-actions";
import { markAllAsRead, deleteNotification, generateTestAlert } from "@/app/dashboard/notifications-actions";

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
  const [isPending, startTransition] = useTransition();
  const [optimisticItems, setOptimisticItems] = useState(items);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync optimistic state when items prop updates from server
  useEffect(() => {
    setOptimisticItems(items);
  }, [items]);

  const unreadCount = optimisticItems.filter((i) => !i.isRead).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Auto mark all as read when opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      setOptimisticItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      startTransition(() => {
        markAllAsRead();
      });
    }
  }, [open, unreadCount]);

  const handleDismiss = (id: string) => {
    setOptimisticItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => {
      deleteNotification(id);
    });
  };

  const handleTestAlert = () => {
    startTransition(() => {
      generateTestAlert();
    });
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
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
            {/* Dropdown Menu */}
            <motion.div
              role="dialog"
              aria-modal="true"
              className="absolute right-0 top-full mt-2 z-50 w-[360px] max-h-[85vh] rounded-[var(--radius-card)] border border-line bg-elevated shadow-lg flex flex-col origin-top-right overflow-hidden"
              initial={reduce ? { opacity: 0 } : { scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4 shrink-0 bg-surface/30">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-fg tracking-wide uppercase">Notifications</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestAlert}
                    disabled={isPending}
                    className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                  >
                    Test Alert
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {optimisticItems.length ? (
                  <ul className="flex flex-col gap-1 p-2">
                    {optimisticItems.map((n) => {
                      const isRisk = n.title.toLowerCase().includes("risk") || n.title.toLowerCase().includes("error");
                      return (
                        <li 
                          key={n.id} 
                          className="group relative flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface bg-transparent"
                        >
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                            isRisk ? "bg-negative-soft text-negative" : "bg-accent-soft text-accent"
                          )}>
                            {isRisk ? <Warning size={16} weight="bold" /> : <Info size={16} weight="bold" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold truncate text-fg-subtle group-hover:text-fg transition-colors">
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-fg-faint">{relTime(n.createdAt)}</span>
                            </div>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
                              {n.message}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDismiss(n.id)}
                            disabled={isPending}
                            aria-label="Dismiss notification"
                            className="absolute right-2 top-2 rounded p-1 text-fg-faint opacity-0 transition-all hover:bg-line hover:text-fg group-hover:opacity-100 disabled:opacity-50"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-[180px] flex-col items-center justify-center px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface mb-3">
                      <Bell size={20} weight="light" className="text-fg-faint" />
                    </div>
                    <p className="text-[13px] font-medium text-fg-subtle">No new notifications</p>
                    <p className="mt-1 text-[12px] text-fg-faint">
                      You're all caught up for now.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="shrink-0 border-t border-line p-3 bg-surface/30">
                <Link
                  href={dashboardUrl("/settings")}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-[var(--radius-control)] bg-surface border border-transparent py-2 text-center text-xs font-medium text-fg transition-colors hover:bg-elevated hover:border-line"
                >
                  Notification settings
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
