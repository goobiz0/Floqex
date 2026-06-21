"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/** Segmented one-time-code input with auto-advance, backspace, and paste. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  /** Applied to the first cell so an external <label htmlFor> can target it. */
  id?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function setChar(index: number, char: string) {
    const next = (value.slice(0, index) + char + value.slice(index + 1)).slice(0, length);
    onChange(next);
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setChar(index, digit);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Verification code">
      {chars.map((char, index) => (
        <input
          key={index}
          id={index === 0 ? id : undefined}
          aria-label={`Verification code digit ${index + 1} of ${length}`}
          ref={(el) => {
            refs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={char}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface text-center text-lg font-medium tabular-nums text-fg transition-colors duration-150 ease-[var(--ease-out)] focus:border-accent disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </div>
  );
}
