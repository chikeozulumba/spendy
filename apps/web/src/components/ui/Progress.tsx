import * as ProgressPrimitive from "@radix-ui/react-progress";
import clsx from "clsx";

/**
 * Indeterminate progress bar — there's no real percentage to report while a
 * statement is queued or processing, so the indicator sweeps continuously
 * rather than claiming a false completion fraction.
 */
export function Progress({ className }: { className?: string }) {
  return (
    <ProgressPrimitive.Root
      value={null}
      className={clsx(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-ink-850",
        className
      )}
    >
      <ProgressPrimitive.Indicator className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gold-500 [animation:progress-sweep_1.3s_ease-in-out_infinite]" />
    </ProgressPrimitive.Root>
  );
}
