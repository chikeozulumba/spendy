/**
 * Bank statement dates (transaction date, statement period start/end) are SQL
 * DATE columns with no time component, but arrive over the wire as full ISO
 * datetimes at UTC midnight (e.g. "2025-10-01T00:00:00.000Z") — the postgres
 * driver hands JS Date objects to JSON.stringify. Formatting those in the
 * viewer's local timezone can shift the calendar day by one (anyone west of
 * UTC would see "Sep 30"), so these are always read back out pinned to UTC,
 * matching how they were written — never the viewer's local timezone.
 */
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** e.g. "Oct 1, 2025" — statement periods, transaction rows. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** e.g. "Oct 1" — compact form for chart axis ticks. */
export function formatDateShort(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}
