import { colorForCategory } from "../../palette";
import { Badge } from "./Badge";

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

  if (tier === "uncategorized") {
    return <Badge variant="dashed">Uncategorized</Badge>;
  }

  const color = colorForCategory(category);

  if (tier === "flow") {
    return (
      <Badge variant="outline" color={color}>
        {category}
      </Badge>
    );
  }

  return (
    <Badge variant={tier === "essential" ? "solid" : "soft"} color={color}>
      {category}
    </Badge>
  );
}
