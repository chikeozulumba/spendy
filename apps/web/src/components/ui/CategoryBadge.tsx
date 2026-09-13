import { colorForCategory } from "../../palette";

// A rough personal-finance hierarchy, not just a distinct color per category:
// essentials read as the most visually "solid" (filled pill), discretionary
// spending a step lighter, and money-movement categories (income/transfers/
// fees — not really "spending" at all) as an outline rather than a fill, so
// the tier itself carries meaning independent of which hue a category has.
const ESSENTIAL = new Set(["Food & Groceries", "Rent/Housing", "Utilities", "Health", "Transport"]);
const FLOW = new Set(["Income", "Transfers", "Fees/Charges"]);

type Tier = "essential" | "discretionary" | "flow" | "uncategorized";

function tierFor(category: string | null): Tier {
  if (!category) return "uncategorized";
  if (ESSENTIAL.has(category)) return "essential";
  if (FLOW.has(category)) return "flow";
  return "discretionary";
}

export function CategoryBadge({ category }: { category: string | null }) {
  const tier = tierFor(category);
  const color = colorForCategory(category);

  if (tier === "uncategorized") {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs font-medium text-text-600">
        Uncategorized
      </span>
    );
  }

  if (tier === "flow") {
    return (
      <span
        className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
        style={{ borderColor: `${color}66`, color }}
      >
        {category}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}${tier === "essential" ? "26" : "14"}`, color }}
    >
      {category}
    </span>
  );
}
