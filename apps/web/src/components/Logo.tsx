import clsx from "clsx";

/**
 * The mark reads left to right as a small spend line — a dip, a bump, a dip —
 * that resolves into a checkmark on the final stroke. It's the same shape the
 * app draws every day in SpendOverTimeChart, ending in the same tick used on
 * ReconciliationStamp: one continuous line for "money moved" and "it checks out."
 */
const MARK_PATH = "M4,9 L9,15 L14,12.5 L15.5,17 L21,6";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={MARK_PATH}
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Just the final tick — reused inside ReconciliationStamp so the seal and the brand mark share a stroke. */
export function CheckTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6,13.5 L11,17.5 L18,6"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-ink-900 text-moss-400">
        <LogoMark className="h-[18px] w-[18px]" />
      </span>
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-text-100">
          Spendy
        </span>
      )}
    </span>
  );
}
