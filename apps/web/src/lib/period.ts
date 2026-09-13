/**
 * Budgets/comparisons are always computed in UTC calendar terms (matching
 * how statement/transaction DATE columns are stored and read — see
 * formatDate.ts) so "this month" means the same thing regardless of the
 * viewer's timezone.
 */
export interface Period {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthRange(year: number, month: number): Period {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function currentMonth(): Period {
  const now = new Date();
  return monthRange(now.getUTCFullYear(), now.getUTCMonth());
}

export function yearRange(year: number): Period {
  return {
    start: toIsoDate(new Date(Date.UTC(year, 0, 1))),
    end: toIsoDate(new Date(Date.UTC(year, 11, 31))),
  };
}

export function shiftMonths(period: Period, delta: number): Period {
  const [year, month] = period.start.split("-").map(Number);
  return monthRange(year, month - 1 + delta);
}

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Renders a period as "March 2026" when it's exactly a calendar month, else "Mar 1 – Mar 15, 2026". */
export function formatPeriodLabel(period: Period): string {
  const start = new Date(`${period.start}T00:00:00Z`);
  const end = new Date(`${period.end}T00:00:00Z`);
  const isFullMonth =
    start.getUTCDate() === 1 &&
    end.getUTCDate() === new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  if (isFullMonth) return monthLabelFormatter.format(start);
  return `${dayLabelFormatter.format(start)} – ${dayLabelFormatter.format(end)}`;
}
