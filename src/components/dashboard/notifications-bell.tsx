"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, X, Check, Info, Warning } from "@phosphor-icons/react";
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
  const [isPending, startTransition] = useTransition();
  const [optimisticItems, setOptimisticItems] = useState(items);

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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleMarkAsRead = (id: string) => {
    setOptimisticItems((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    startTransition(() => {
      markAsRead(id);
    });
  };

  const handleClearAll = () => {
    setOptimisticItems([]);
    startTransition(() => {
      clearAllNotifications();
    });
  };

  const handleTestAlert = () => {
    startTransition(() => {
      generateTestAlert();
    });
  };

  return (
    <div className="relative inline-flex">
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
            {/* Transparent backdrop for click-outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            
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
                  <h2 className="text-sm font-semibold text-fg">Alerts & Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-[var(--color-on-accent)]">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestAlert}
                    disabled={isPending}
                    className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                  >
                    Test
                  </button>
                  {optimisticItems.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={isPending}
                      className="text-[11px] font-medium text-fg-subtle hover:text-fg transition-colors disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  )}
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
                          className={cn(
                            "group relative flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface",
                            !n.isRead ? "bg-accent-soft/5" : "bg-transparent"
                          )}
                        >
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                            isRisk ? "bg-negative-soft text-negative" : "bg-accent-soft text-accent"
                          )}>
                            {isRisk ? <Warning size={16} weight="bold" /> : <Info size={16} weight="bold" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                "text-[13px] font-semibold truncate", 
                                !n.isRead ? "text-fg" : "text-fg-subtle"
                              )}>
                                {n.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-fg-faint">{relTime(n.createdAt)}</span>
                            </div>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
                              {n.message}
                            </p>
                            
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                disabled={isPending}
                                className="mt-2.5 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-surface border border-line px-2 py-1 text-[10px] font-medium text-fg-subtle transition-colors hover:text-fg hover:bg-line disabled:opacity-50"
                              >
                                <Check size={12} className="text-accent" /> Mark read
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center px-4 text-center">
                    <p className="text-sm font-medium text-fg-muted">No alerts</p>
                    <p className="mt-1 text-xs text-fg-subtle">
                      You are all caught up.
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
