import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

export type BadgeTone = "moss" | "rust" | "gold";
export type BadgeVariant = "solid" | "soft" | "outline" | "dashed";

// The same three hex values styles.css defines for these tokens — kept here
// too so a badge can mix a fixed semantic tone (`tone="rust"`, a real status
// like "over budget") with a dynamic per-item hue (`color="#..."`, the
// categorical palette in palette.ts) through one consistent rendering path,
// rather than two different color systems producing two different-looking
// badges.
export const TONE_HEX: Record<BadgeTone, string> = {
  moss: "#2e7d4f",
  rust: "#c23b2a",
  gold: "#a6710a",
};

// One alpha scale for every colored badge in the app: "solid" is the
// strongest reserved for what matters most (essentials, hard status like
// overdue), "soft" is the default resting weight, "outline" is for
// identified-but-not-really-a-category things (money movement, not spend).
const SOLID_ALPHA = "29"; // ~16%
const SOFT_ALPHA = "12"; // ~7%
const OUTLINE_BORDER_ALPHA = "59"; // ~35%

export function Badge({
  variant,
  tone,
  color,
  icon: Icon,
  children,
  className,
}: {
  variant: BadgeVariant;
  /** A fixed semantic tone (moss/rust/gold) — takes precedence over `color`. */
  tone?: BadgeTone;
  /** A raw hex color, for per-item hues that don't map to a fixed tone (a
   * category's or contact type's color from palette.ts). Ignored for
   * `variant="dashed"`, which is always neutral gray. */
  color?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none";

  if (variant === "dashed") {
    return (
      <span
        className={cn(
          base,
          "border border-dashed border-line-strong text-text-600",
          className
        )}
      >
        {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />}
        {children}
      </span>
    );
  }

  const resolved = tone ? TONE_HEX[tone] : color;
  const style =
    variant === "outline"
      ? { borderColor: `${resolved}${OUTLINE_BORDER_ALPHA}`, color: resolved }
      : { backgroundColor: `${resolved}${variant === "solid" ? SOLID_ALPHA : SOFT_ALPHA}`, color: resolved };

  return (
    <span className={cn(base, variant === "outline" && "border", className)} style={style}>
      {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />}
      {children}
    </span>
  );
}
