"use client";

import React from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Isolates a single dashboard widget so a render error in one widget shows a
 * contained fallback instead of blanking the whole grid. Pairs with the
 * route-level error.tsx, which only catches server/render failures of the page.
 */
export class WidgetBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Widget render error:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <WarningCircle size={20} weight="duotone" className="text-warning" />
          <p className="text-xs font-medium text-fg-subtle">This widget hit an error.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1 text-xs font-medium text-fg transition-colors hover:bg-surface-hover"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
