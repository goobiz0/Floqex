"use client";

import { useId, useRef, useState, type ReactNode, isValidElement, cloneElement, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { Question } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Accessible tooltip. Shows on hover and keyboard focus, hides on blur / mouse
 * leave / Escape. Rendered in a portal with fixed positioning so it never gets
 * clipped by a card's `overflow-hidden`. The trigger is described by the bubble
 * via `aria-describedby`.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
  asChild = false,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  asChild?: boolean;
}) {
  const reduce = useReducedMotion();
  const id = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; place: "top" | "bottom" } | null>(null);

  function show() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Flip below if there isn't room above.
    const place = side === "top" && r.top > 90 ? "top" : "bottom";
    setCoords({
      x: r.left + r.width / 2,
      y: place === "top" ? r.top - 8 : r.bottom + 8,
      place,
    });
  }
  function hide() {
    setCoords(null);
  }

  const childProps = {
    "aria-describedby": coords ? id : undefined,
    onMouseEnter: (e: any) => { show(); if (isValidElement(children)) children.props.onMouseEnter?.(e); },
    onMouseLeave: (e: any) => { hide(); if (isValidElement(children)) children.props.onMouseLeave?.(e); },
    onFocus: (e: any) => { show(); if (isValidElement(children)) children.props.onFocus?.(e); },
    onBlur: (e: any) => { hide(); if (isValidElement(children)) children.props.onBlur?.(e); },
    onKeyDown: (e: any) => {
      if (e.key === "Escape") hide();
      if (isValidElement(children)) children.props.onKeyDown?.(e);
    },
  };

  return (
    <>
      {asChild && isValidElement(children) ? (
        cloneElement(children as ReactElement, { ref: triggerRef, ...childProps })
      ) : (
        <span
          ref={triggerRef as any}
          className={cn("inline-flex cursor-help", className)}
          tabIndex={0}
          role="button"
          {...childProps}
        >
          {children}
        </span>
      )}
      {coords && typeof document !== "undefined"
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              style={{
                position: "fixed",
                left: coords.x,
                top: coords.y,
                transform: `translate(-50%, ${coords.place === "top" ? "-100%" : "0"})`,
              }}
              className={cn(
                "pointer-events-none z-[100] max-w-[260px] rounded-[var(--radius-control)] border border-line bg-overlay px-3 py-2 text-xs leading-relaxed text-fg shadow-[var(--shadow-lg)] backdrop-blur",
                !reduce && "motion-safe:animate-[appear_0.12s_ease-out]",
              )}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Convenience: a small question-mark trigger that reveals helper text. */
export function InfoTip({ content, label = "More information" }: { content: ReactNode; label?: string }) {
  return (
    <Tooltip content={content}>
      <span aria-label={label} className="text-fg-faint transition-colors hover:text-fg-muted">
        <Question size={14} weight="bold" />
      </span>
    </Tooltip>
  );
}
