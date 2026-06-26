"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Input } from "./input";

// A number input that is actually pleasant to type into.
//
// The naive approach (clamp on every keystroke, value bound to a number) makes
// it impossible to clear the field or type a value like "0.3" one character at
// a time — and if the max is 0.5 it fights you the moment you type "3". This
// keeps the raw text locally so you can type freely (including an empty field),
// and only clamps to [min, max] when you blur or press Enter. Typing a value
// above the max simply snaps to the max; an empty/invalid entry reverts to the
// last good value.
export function ClampedNumberInput({
  value,
  min,
  max,
  onCommit,
  trailing,
  className,
  id,
  ariaLabel,
  allowNegative = false,
}: {
  value: number;
  min?: number;
  max?: number;
  onCommit: (v: number) => void;
  trailing?: ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
  allowNegative?: boolean;
}) {
  const [text, setText] = useState<string>(() => String(value));
  const focused = useRef(false);

  // Mirror external value changes (e.g. an approved suggestion) while the user
  // isn't actively editing the field.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let v = n;
    if (typeof min === "number" && v < min) v = min;
    if (typeof max === "number" && v > max) v = max;
    return v;
  };

  const commit = () => {
    focused.current = false;
    const parsed = Number(text);
    if (text.trim() === "" || Number.isNaN(parsed)) {
      setText(String(value)); // revert to last good value
      return;
    }
    const clamped = clamp(parsed);
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      trailing={trailing}
      className={className}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || pattern.test(raw)) setText(raw);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
