// Categorical palette — same hue rotation/order as before, deepened for a
// light surface: on a dark card these hues could sit at a muted mid-tone and
// still pop, but on a light-gray/white card they need more depth to read
// clearly and avoid looking washed out. Identity is always additionally
// direct-labeled, never carried by color alone.
const DARK_CATEGORICAL = [
  "#3a6e93", // slate blue
  "#b15a34", // terracotta
  "#2c7a63", // teal
  "#8f6a1e", // ochre
  "#8c4f72", // mauve
  "#4c7a3c", // moss
  "#5c55a0", // indigo
  "#9c3f35", // brick
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
  Other: "#83868c", // muted — not a real "identity", genuinely uncategorized
};

export function colorForCategory(category: string | null): string {
  return (category && CATEGORY_COLORS[category]) || CATEGORY_COLORS.Other;
}

// For series with no fixed/known label set (e.g. bank names, which are
// whatever the LLM inferred) — cycles the same categorical hues by position
// instead of by name.
export function colorForIndex(index: number): string {
  return DARK_CATEGORICAL[index % DARK_CATEGORICAL.length];
}

// A same-hue sequential ramp (all shades of one green) reads fine for a
// single stacked series, but this chart draws years as *unstacked*,
// semi-transparent, overlapping areas — with only saturation/lightness
// differing, overlapping fills blend into one indistinguishable blob rather
// than a set of visibly distinct years. So years get distinct hues instead,
// same as categories/banks — recency is carried by the direct year label
// (axis/legend/tooltip), not by a light-to-dark ramp.
export function colorForYear(index: number): string {
  return DARK_CATEGORICAL[index % DARK_CATEGORICAL.length];
}

export const CHART_SURFACE = "#fdfdfd";
export const GRIDLINE = "#e4e7eb";
export const AXIS_INK = "#6b7178";
// Bookkeeping convention: spending reads in rust ("in the red"), money in reads in moss ("in the black").
export const DEBIT_COLOR = "#c23b2a";
export const CREDIT_COLOR = "#2e7d4f";
