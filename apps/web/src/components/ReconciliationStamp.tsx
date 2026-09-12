import clsx from "clsx";
import { CheckTick } from "./Logo";

/**
 * A rubber-stamp seal for the one thing this product actually verifies: does the
 * statement reconcile? Rendered like ink on paper — rotated, double-ringed, worn
 * at 90% opacity — using the same checkmark stroke as the wordmark.
 */
export default function ReconciliationStamp({
  ok,
  className,
}: {
  ok: boolean;
  className?: string;
}) {
  const tone = ok ? "text-moss-400" : "text-rust-400";

  return (
    <div
      role="img"
      aria-label={ok ? "Balance verified" : "Needs review"}
      className={clsx(
        "relative flex h-[86px] w-[86px] shrink-0 -rotate-6 select-none flex-col items-center justify-center gap-0.5 rounded-full opacity-90",
        tone,
        className
      )}
    >
      <div className="absolute inset-0 rounded-full border-2 border-current" />
      <div className="absolute inset-[6px] rounded-full border border-dashed border-current opacity-50" />
      {ok ? (
        <>
          <span className="font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.16em]">
            Balance
          </span>
          <CheckTick className="my-0.5 h-3.5 w-3.5" />
          <span className="font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.16em]">
            Verified
          </span>
        </>
      ) : (
        <>
          <span className="font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.16em]">
            Needs
          </span>
          <span className="my-0.5 text-sm font-bold leading-none">!</span>
          <span className="font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.16em]">
            Review
          </span>
        </>
      )}
    </div>
  );
}
