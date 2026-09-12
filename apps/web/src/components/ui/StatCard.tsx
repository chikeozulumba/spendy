import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

const TONE_CLASSES = {
  moss: "bg-moss-400/10 text-moss-400",
  rust: "bg-rust-400/10 text-rust-400",
  gold: "bg-gold-400/10 text-gold-400",
  neutral: "bg-ink-850 text-text-400",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "moss",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASSES[tone]
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-tight tracking-wide text-text-400">
          {label}
        </p>
        <p className="mt-1 truncate font-mono text-xl font-semibold text-text-100">{value}</p>
      </div>
    </Card>
  );
}
