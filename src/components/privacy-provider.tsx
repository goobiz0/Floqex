"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type PrivacyContextType = {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextType>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("privacyMode") === "true") {
      queueMicrotask(() => setIsPrivacyMode(true));
    }
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem("privacyMode", String(next));
      // Optionally trigger a class on body to let CSS handle blurs globally
      if (next) {
        document.documentElement.classList.add("privacy-mode");
      } else {
        document.documentElement.classList.remove("privacy-mode");
      }
      return next;
    });
  };

  // Ensure initial class is set on mount if true
  useEffect(() => {
    if (isPrivacyMode) {
      document.documentElement.classList.add("privacy-mode");
    } else {
      document.documentElement.classList.remove("privacy-mode");
    }
  }, [isPrivacyMode]);

  return (
    <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
