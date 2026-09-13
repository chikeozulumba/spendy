import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "../../lib/cn";

/**
 * shadcn's Calendar, adapted from react-day-picker v9 to this app's light
 * theme. v9 only puts modifier classes (selected/today/disabled/outside) on
 * the day *cell* (<td>), not the day *button* — but it does add matching
 * data-selected/data-today/etc. attributes to that same cell (confirmed by
 * reading node_modules/react-day-picker's source directly, since v8→v9 moved
 * a lot of this and guessing from memory would be a real risk of silently
 * rendering an unstyled "selected" day). So the cell gets `group` and the
 * button is themed via `group-data-[selected=true]:...` etc. rather than a
 * plain modifier class on the button itself.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center items-center h-8 relative",
        caption_label: "text-sm font-medium text-text-100",
        nav: "flex items-center justify-between absolute inset-x-0",
        button_previous:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-text-400 hover:border-line-strong hover:text-text-100 disabled:pointer-events-none disabled:opacity-30",
        button_next:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-line text-text-400 hover:border-line-strong hover:text-text-100 disabled:pointer-events-none disabled:opacity-30",
        month_grid: "w-full border-collapse mt-2",
        weekdays: "flex",
        weekday: "w-9 text-center text-xs font-medium text-text-600",
        week: "flex w-full mt-1",
        day: "group relative h-9 w-9 p-0 text-center text-sm",
        day_button:
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-text-100 transition-colors hover:bg-ink-850 group-data-[today=true]:border group-data-[today=true]:border-moss-500 group-data-[selected=true]:bg-moss-500 group-data-[selected=true]:text-ink-950 group-data-[selected=true]:hover:bg-moss-500 group-data-[outside=true]:text-text-600 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-30",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          ) : (
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          ),
      }}
      {...props}
    />
  );
}
