import type { CSSProperties } from "react";
import { cn } from "../../lib/cn";

/** Base pulsing placeholder block — every skeleton in the app composes this. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-850", className)} style={style} />;
}
