import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;

// Inverted (dark-on-light) rather than matching the app's own light card
// surface — a tooltip that's nearly the same tone as the page it floats over
// barely reads as a distinct, floating thing. The high-contrast chip is what
// most every dark-tooltip-on-light-app convention (GitHub, Linear, Vercel)
// relies on for the same reason.
export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 max-w-64 animate-[tooltip-in_120ms_ease-out] rounded-md bg-text-100 px-3 py-1.5 text-center text-xs font-medium text-ink-950 shadow-lg"
        >
          {label}
          <TooltipPrimitive.Arrow className="fill-text-100" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
