/**
 * Shortens a label for tight spaces (chart axis ticks, inline bar labels):
 * first word only, then hard-capped with an ellipsis if that word alone is
 * still too long. "Food & Groceries" -> "Food"; "Entertainment" (already one
 * word, 13 chars) -> "Entertainm…".
 */
export function shortenLabel(value: string, maxLength = 9): string {
  const word = value.split(" ")[0];
  return word.length > maxLength ? `${word.slice(0, maxLength)}…` : word;
}
