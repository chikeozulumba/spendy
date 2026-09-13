import { Building2, HelpCircle, MapPin, Sparkles, User } from "lucide-react";
import type { ContactType } from "../../types";
import { colorForIndex } from "../../palette";
import { Badge } from "./Badge";

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
  const { label, icon, colorIndex } = CONFIG[type] ?? CONFIG.unknown;

  if (colorIndex < 0) {
    return (
      <Badge variant="dashed" icon={icon}>
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="soft" color={colorForIndex(colorIndex)} icon={icon}>
      {label}
    </Badge>
  );
}
