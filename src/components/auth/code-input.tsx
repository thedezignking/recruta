"use client";

import { useRef } from "react";
import { cn } from "cn";

/**
 * Six one-character boxes for an emailed code. Typing moves forward,
 * Backspace moves back, and pasting or the phone's suggested code fills every
 * box at once (`autocomplete="one-time-code"` on the first box).
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  function set(next: string, focusIndex?: number) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (focusIndex !== undefined)
      refs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  }

  return (
    <div
      role="group"
      aria-label="Verification code"
      className="flex justify-between gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digit}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          autoFocus={index === 0}
          maxLength={index === 0 ? length : 1}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, "");
            if (!typed) {
              set(value.slice(0, index) + value.slice(index + 1));
              return;
            }
            // A pasted or suggested code arrives as several characters.
            if (typed.length > 1) {
              set(value.slice(0, index) + typed, index + typed.length);
              return;
            }
            const next = (
              value.slice(0, index) +
              typed +
              value.slice(index + 1)
            ).slice(0, length);
            set(next, index + 1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) {
              event.preventDefault();
              set(value.slice(0, index - 1) + value.slice(index), index - 1);
            } else if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault();
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < length - 1) {
              event.preventDefault();
              refs.current[index + 1]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData
              .getData("text")
              .replace(/\D/g, "");
            if (!pasted) return;
            event.preventDefault();
            set(pasted, pasted.length);
          }}
          className={cn(
            "h-14 w-full min-w-0 rounded-lg border bg-white text-center font-mono text-2xl font-semibold tabular-nums outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#5C5AED] focus:ring-3 focus:ring-[#5C5AED]/20 disabled:opacity-60 sm:h-16",
            invalid ? "border-destructive" : "border-input",
          )}
        />
      ))}
    </div>
  );
}
