// Categorical palette — same hue rotation and order as the dataviz skill's
// validated reference set, but pulled down in saturation/lightness to sit in
// the same muted "ledger ink" family as the rest of the UI (moss/rust/gold)
// instead of the fully-saturated defaults, which read as candy-bright next to
// a deliberately restrained dark surface. Identity is always additionally
// direct-labeled, never carried by color alone.
const DARK_CATEGORICAL = [
  "#5b7f9e", // slate blue
  "#c1704a", // terracotta
  "#4f9179", // teal
  "#b98a3a", // ochre
  "#a26a8a", // mauve
  "#6f8f5c", // moss
  "#7c72a8", // indigo
  "#b5544a", // brick
];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Groceries": DARK_CATEGORICAL[0],
  Transport: DARK_CATEGORICAL[1],
  "Rent/Housing": DARK_CATEGORICAL[2],
  Utilities: DARK_CATEGORICAL[3],
  Subscriptions: DARK_CATEGORICAL[4],
  Entertainment: DARK_CATEGORICAL[5],
  Shopping: DARK_CATEGORICAL[6],
  Health: DARK_CATEGORICAL[7],
  Income: DARK_CATEGORICAL[0],
  Transfers: DARK_CATEGORICAL[1],
  "Fees/Charges": DARK_CATEGORICAL[2],
  Other: "#898781", // muted — not a real "identity", genuinely uncategorized
};

export function colorForCategory(category: string | null): string {
  return (category && CATEGORY_COLORS[category]) || CATEGORY_COLORS.Other;
}

export const CHART_SURFACE = "#14171c";
export const GRIDLINE = "#262b26";
export const AXIS_INK = "#aca99e";
// Bookkeeping convention: spending reads in rust ("in the red"), money in reads in moss ("in the black").
export const DEBIT_COLOR = "#e2896a";
export const CREDIT_COLOR = "#93b584";
