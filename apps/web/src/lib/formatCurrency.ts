/**
 * The currency is inferred per-statement (from symbols/wording on the source
 * PDF, or "USD" as a fallback when nothing on the statement indicates
 * otherwise) — never assumed to be USD across the whole app. `Intl` also
 * handles symbol placement and thousands/decimal separators correctly per the
 * viewer's locale, which a hardcoded "$" prefix never did.
 */
function formatterFor(currency: string, maximumFractionDigits?: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
    });
  } catch {
    // An unrecognized/malformed code (bad LLM output, stale data) shouldn't
    // crash the page — fall back to USD rather than showing raw numbers.
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      ...(maximumFractionDigits !== undefined ? { maximumFractionDigits } : {}),
    });
  }
}

/** e.g. "$84.32" / "€2,400.00" — transaction amounts, totals. */
export function formatCurrency(amount: number | string, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return formatterFor(currency).format(value);
}

/** e.g. "$450" — no decimals, for chart axis ticks. */
export function formatCurrencyCompact(amount: number | string, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return formatterFor(currency, 0).format(value);
}
