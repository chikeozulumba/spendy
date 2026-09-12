// Normalizes a raw transaction description into a stable "merchant pattern"
// used as the key for category_overrides / merchant_category_cache lookups.
// Mirrors services/pdf-service/app/categorize.py::normalize_merchant — keep
// the two in sync if this logic changes.
export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
