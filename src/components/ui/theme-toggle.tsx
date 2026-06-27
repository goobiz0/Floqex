"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, CaretDown } from "@phosphor-icons/react";
import { Dropdown } from "@/components/ui/dropdown";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  if (!resolvedTheme) {
    return <div className="h-9 w-32 rounded-[var(--radius-control)] bg-surface/50 animate-pulse border border-line" />;
  }

  const items = [
    { label: "Light", icon: <Sun size={14} />, onClick: () => setTheme("light") },
    { label: "Dark", icon: <Moon size={14} />, onClick: () => setTheme("dark") },
    { label: "System", icon: <Monitor size={14} />, onClick: () => setTheme("system") },
  ];

  return (
    <Dropdown
      align="right"
      items={items}
      trigger={
        <button type="button" className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg shadow-[var(--shadow-sm)] hover:border-line-strong hover:bg-surface-hover transition-colors min-w-[120px]">
          <span className="flex items-center gap-2">
            {theme === "light" ? <Sun size={14} /> : theme === "dark" ? <Moon size={14} /> : <Monitor size={14} />}
            {(theme || "system").charAt(0).toUpperCase() + (theme || "system").slice(1)}
          </span>
          <CaretDown size={12} className="text-fg-subtle" />
        </button>
      }
    />
  );
}
