import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { Calendar } from "./Calendar";
import { cn } from "../../lib/cn";

/**
 * Dates round-trip as plain "YYYY-MM-DD" strings elsewhere in the app
 * (lib/period.ts), so parsing/formatting here stays in local-calendar terms
 * (`new Date(y, m-1, d)`, plain getters) rather than `toISOString()`/UTC
 * parsing — those shift the date by a day for viewers on either side of UTC,
 * which is exactly the bug formatDate.ts's UTC-pinning was written to avoid
 * on the *display* side. A date PICKER has no time component to begin with,
 * so the fix here is simpler: never let a timezone conversion touch it.
 */
function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToLocalDate(value) : undefined;
  const minDate = min ? isoToLocalDate(min) : undefined;
  const maxDate = max ? isoToLocalDate(max) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-sm text-text-100 outline-none hover:border-line-strong",
            !selected && "text-text-600",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-text-600" strokeWidth={1.8} />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(localDateToIso(date));
            setOpen(false);
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
