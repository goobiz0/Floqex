"use client";

import { useEffect, useState } from "react";

/** Next NY session open (~09:30 ET ≈ 13:30 UTC). Ticks once a second. */
function nextSession(): Date {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(13, 30, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target;
}

export function Countdown() {
  const [label, setLabel] = useState<string>("--:--:--");

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, nextSession().getTime() - Date.now());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="hidden items-center gap-1.5 text-xs text-fg-subtle sm:inline-flex">
      Next session
      <span className="tnum text-fg-muted">{label}</span>
    </span>
  );
}
