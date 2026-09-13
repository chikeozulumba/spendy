import { useState } from "react";
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import { currentMonth, shiftMonths, yearRange, type Period } from "../lib/period";

type Preset = "this-month" | "last-month" | "this-year" | "custom";

function presetFor(period: Period): Preset {
  const thisMonth = currentMonth();
  const lastMonth = shiftMonths(thisMonth, -1);
  const thisYear = yearRange(new Date().getUTCFullYear());
  if (period.start === thisMonth.start && period.end === thisMonth.end) return "this-month";
  if (period.start === lastMonth.start && period.end === lastMonth.end) return "last-month";
  if (period.start === thisYear.start && period.end === thisYear.end) return "this-year";
  return "custom";
}

/** A month/year/custom-range selector, backed by lib/period.ts's UTC-calendar helpers. */
export function PeriodPicker({
  period,
  onChange,
}: {
  period: Period;
  onChange: (period: Period) => void;
}) {
  const [preset, setPreset] = useState<Preset>(() => presetFor(period));

  function choosePreset(value: string) {
    const next = value as Preset;
    setPreset(next);
    if (next === "this-month") onChange(currentMonth());
    else if (next === "last-month") onChange(shiftMonths(currentMonth(), -1));
    else if (next === "this-year") onChange(yearRange(new Date().getUTCFullYear()));
    // "custom" leaves `period` as-is until the date inputs below are edited.
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={choosePreset}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-month">This month</SelectItem>
          <SelectItem value="last-month">Last month</SelectItem>
          <SelectItem value="this-year">This year</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={period.start}
            max={period.end}
            onChange={(e) => onChange({ ...period, start: e.target.value })}
            className="rounded-md border border-line bg-ink-850 px-2 py-1.5 text-sm text-text-100 outline-none focus:border-moss-500"
          />
          <span className="text-text-600">–</span>
          <input
            type="date"
            value={period.end}
            min={period.start}
            onChange={(e) => onChange({ ...period, end: e.target.value })}
            className="rounded-md border border-line bg-ink-850 px-2 py-1.5 text-sm text-text-100 outline-none focus:border-moss-500"
          />
        </div>
      )}
    </div>
  );
}
