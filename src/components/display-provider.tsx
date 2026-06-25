"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type DisplayMode = "MONEY" | "PERCENTAGE" | "HIDDEN";

type DisplayContextType = {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
};

const DisplayContext = createContext<DisplayContextType>({
  displayMode: "MONEY",
  setDisplayMode: () => {},
});

export function DisplayProvider({ children }: { children: React.ReactNode }) {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("MONEY");

  useEffect(() => {
    const saved = localStorage.getItem("displayMode") as DisplayMode | null;
    if (saved === "MONEY" || saved === "PERCENTAGE" || saved === "HIDDEN") {
      queueMicrotask(() => setDisplayModeState(saved));
    }
  }, []);

  const setDisplayMode = (mode: DisplayMode) => {
    setDisplayModeState(mode);
    localStorage.setItem("displayMode", mode);
    
    document.documentElement.classList.remove("display-mode-money", "display-mode-percent", "display-mode-hidden");
    if (mode === "MONEY") document.documentElement.classList.add("display-mode-money");
    if (mode === "PERCENTAGE") document.documentElement.classList.add("display-mode-percent");
    if (mode === "HIDDEN") document.documentElement.classList.add("display-mode-hidden");
  };

  // Ensure initial class is set on mount
  useEffect(() => {
    document.documentElement.classList.remove("display-mode-money", "display-mode-percent", "display-mode-hidden");
    if (displayMode === "MONEY") document.documentElement.classList.add("display-mode-money");
    if (displayMode === "PERCENTAGE") document.documentElement.classList.add("display-mode-percent");
    if (displayMode === "HIDDEN") document.documentElement.classList.add("display-mode-hidden");
  }, [displayMode]);

  return (
    <DisplayContext.Provider value={{ displayMode, setDisplayMode }}>
      {children}
    </DisplayContext.Provider>
  );
}

export const useDisplayMode = () => useContext(DisplayContext);
