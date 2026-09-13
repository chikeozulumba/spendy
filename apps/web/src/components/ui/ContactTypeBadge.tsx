import { Building2, HelpCircle, MapPin, Sparkles, User } from "lucide-react";
import type { ContactType } from "../../types";
import { colorForIndex } from "../../palette";

// Reuses the app's shared categorical hue rotation (same one CategoryBadge
// draws from) rather than introducing new colors, so a contact's type badge
// reads as part of the same visual language as a transaction's category badge.
const CONFIG: Record<ContactType, { label: string; icon: typeof User; colorIndex: number }> = {
  person: { label: "Person", icon: User, colorIndex: 4 },
  business: { label: "Business", icon: Building2, colorIndex: 5 },
  place: { label: "Place", icon: MapPin, colorIndex: 3 },
  other: { label: "Other", icon: Sparkles, colorIndex: 1 },
  unknown: { label: "Unknown", icon: HelpCircle, colorIndex: -1 },
};

export function ContactTypeBadge({ type }: { type: ContactType }) {
  const { label, icon: Icon, colorIndex } = CONFIG[type] ?? CONFIG.unknown;

  if (colorIndex < 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs font-medium text-text-600">
        <Icon className="size-3.5" strokeWidth={1.8} />
        {label}
      </span>
    );
  }

  const color = colorForIndex(colorIndex);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <Icon className="size-3.5" strokeWidth={1.8} />
      {label}
    </span>
  );
}
