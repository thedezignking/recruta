"use client";

import { useId, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  AltArrowLeftIcon,
  AltArrowRightIcon,
  CalendarIcon,
} from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value?: string | Date | null) {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  minDate,
}: {
  id: string;
  value?: string | Date | null;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  minDate?: Date;
}) {
  const calendarId = useId().replaceAll(":", "");
  const selected = parseDate(value);
  const today = new Date();
  const earliest = minDate ? monthStart(minDate) : null;
  const minimumDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const [open, setOpen] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [month, setMonth] = useState(() => monthStart(selected ?? today));
  const [focused, setFocused] = useState(() => selected ?? today);
  const dayButtons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const slots = Math.ceil((offset + daysInMonth) / 7) * 7;

  function moveFocus(date: Date) {
    if (minimumDay && date < minimumDay) return;
    setFocused(date);
    setMonth(monthStart(date));
    requestAnimationFrame(() => dayButtons.current.get(dateKey(date))?.focus());
  }

  function select(date: Date) {
    if (minimumDay && date < minimumDay) return;
    onChange(dateKey(date));
    setFocused(date);
    setOpen(false);
  }

  function onDayKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: Date,
  ) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(addDays(date, moves[event.key]));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const weekday = (date.getDay() + 6) % 7;
      moveFocus(addDays(date, event.key === "Home" ? -weekday : 6 - weekday));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const direction = event.key === "PageUp" ? -1 : 1;
      const next = new Date(date.getFullYear(), date.getMonth() + direction, 1);
      moveFocus(
        new Date(
          next.getFullYear(),
          next.getMonth(),
          Math.min(
            date.getDate(),
            new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
          ),
        ),
      );
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const active = selected ?? today;
          setMonth(monthStart(active));
          setFocused(active);
          setShowMonths(false);
        }
      }}
    >
      <Popover.Trigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={cn(
              "h-9 w-full justify-between rounded-md bg-white px-3 text-sm font-normal shadow-none",
              !selected && "text-muted-foreground",
            )}
          />
        }
      >
        <span>
          {selected
            ? new Intl.DateTimeFormat("en", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(selected)
            : "Select a date"}
        </span>
        <CalendarIcon
          size={14}
          aria-hidden="true"
          className="text-foreground/70"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          align="start"
          className="z-60 max-w-[calc(100vw-2rem)]"
        >
          <Popover.Popup className="w-[320px] rounded-[10px] border border-[#E8E8E8] bg-white p-3 text-foreground shadow-[0_12px_36px_rgb(17_17_17/0.12),0_2px_8px_rgb(17_17_17/0.05)] outline-none">
            <Popover.Title className="sr-only">
              Choose application deadline
            </Popover.Title>
            <div className="flex items-center gap-2 pb-3">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-8 shadow-none"
                aria-label="Previous month"
                disabled={Boolean(earliest && month <= earliest)}
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <AltArrowLeftIcon size={16} aria-hidden="true" />
              </Button>
              <button
                type="button"
                className="flex h-8 flex-1 items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-[#F8F8F8] focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Choose month"
                aria-expanded={showMonths}
                onClick={() => setShowMonths((value) => !value)}
              >
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  year: "numeric",
                }).format(month)}
                <span aria-hidden="true" className="text-muted-foreground">
                  ⌄
                </span>
              </button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-8 shadow-none"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <AltArrowRightIcon size={16} aria-hidden="true" />
              </Button>
            </div>
            {showMonths ? (
              <div className="grid grid-cols-3 gap-2 py-2" aria-label="Months">
                {Array.from({ length: 12 }, (_, index) => {
                  const candidate = new Date(month.getFullYear(), index, 1);
                  const active = index === month.getMonth();
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={Boolean(earliest && candidate < earliest)}
                      onClick={() => {
                        setMonth(candidate);
                        setShowMonths(false);
                      }}
                      className={cn(
                        "h-9 rounded-md text-sm hover:bg-[#F1F1F1] focus-visible:outline-2 focus-visible:outline-primary disabled:text-muted-foreground/40",
                        active &&
                          "bg-primary font-medium text-white hover:bg-primary",
                      )}
                    >
                      {new Intl.DateTimeFormat("en", { month: "short" }).format(
                        candidate,
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                id={calendarId}
                role="grid"
                aria-label={new Intl.DateTimeFormat("en", {
                  month: "long",
                  year: "numeric",
                }).format(month)}
                className="grid grid-cols-7 gap-1 border-t border-[#E8E8E8] pt-2"
              >
                {weekdays.map((day) => (
                  <span
                    key={day}
                    role="columnheader"
                    className="grid h-8 place-items-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </span>
                ))}
                {Array.from({ length: slots }, (_, slot) => {
                  const day = slot - offset + 1;
                  const date = new Date(
                    month.getFullYear(),
                    month.getMonth(),
                    day,
                  );
                  const key = dateKey(date);
                  const outside = day < 1 || day > daysInMonth;
                  const disabled =
                    Boolean(minimumDay && date < minimumDay) || outside;
                  const isSelected = selected && dateKey(selected) === key;
                  const isToday = dateKey(today) === key;
                  return (
                    <span
                      key={key}
                      role="gridcell"
                      aria-selected={Boolean(isSelected)}
                    >
                      <button
                        ref={(node) => {
                          if (node) dayButtons.current.set(key, node);
                          else dayButtons.current.delete(key);
                        }}
                        type="button"
                        aria-label={new Intl.DateTimeFormat("en", {
                          dateStyle: "full",
                        }).format(date)}
                        aria-current={isToday ? "date" : undefined}
                        disabled={disabled}
                        tabIndex={dateKey(focused) === key ? 0 : -1}
                        onKeyDown={(event) => onDayKeyDown(event, date)}
                        onClick={() => select(date)}
                        className={cn(
                          "grid size-9 place-items-center rounded-full text-sm tabular-nums outline-none hover:bg-[#F1F1F1] focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent",
                          isToday &&
                            !isSelected &&
                            "font-semibold text-primary",
                          isSelected &&
                            "bg-primary font-semibold text-white hover:bg-primary",
                        )}
                      >
                        {date.getDate()}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-[#E8E8E8] pt-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={Boolean(minimumDay && today < minimumDay)}
                  onClick={() => select(today)}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={Boolean(
                    minimumDay && addDays(today, 1) < minimumDay,
                  )}
                  onClick={() => select(addDays(today, 1))}
                >
                  Tomorrow
                </Button>
              </div>
              {selected && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear date
                </Button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
