"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { motion } from "motion/react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9" />; // Placeholder to prevent layout shift
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="Toggle theme"
    >
      <div className="relative h-5 w-5 overflow-hidden">
        <motion.div
          initial={false}
          animate={{
            y: isDark ? "100%" : "0%",
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun size={20} weight="bold" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            y: isDark ? "0%" : "-100%",
            opacity: isDark ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon size={20} weight="bold" />
        </motion.div>
      </div>
    </button>
  );
}
