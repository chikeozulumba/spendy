import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-ink-900 p-5 shadow-sm shadow-black/[0.03]",
        className
      )}
      {...props}
    />
  );
}

/** Small tracked-out uppercase label used to head a section of a card — a real structural marker, not decoration. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-400",
        className
      )}
      {...props}
    />
  );
}
