import { forwardRef, type ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

// A side preview panel — same Radix Dialog primitive as ui/Dialog.tsx (same
// focus-trap/escape/overlay semantics), just anchored to the right edge and
// sliding in from off-screen instead of scaling in from the page's center.
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  showClose = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-[2px]",
          "data-[state=open]:animate-[dialog-overlay-in_180ms_ease-out]",
          "data-[state=closed]:animate-[dialog-overlay-out_150ms_ease-in]"
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col",
          "border-l border-line bg-ink-900 shadow-xl outline-none",
          "data-[state=open]:animate-[sheet-content-in_220ms_cubic-bezier(0.16,1,0.3,1)]",
          "data-[state=closed]:animate-[sheet-content-out_180ms_ease-in]",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-text-400 outline-none transition-colors hover:bg-ink-850 hover:text-text-100 focus-visible:ring-2 focus-visible:ring-moss-500">
            <X className="h-4 w-4" strokeWidth={1.8} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-line px-5 py-4 pr-10", className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold text-text-100", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-text-400", className)} {...props} />;
}

export const SheetBody = forwardRef<HTMLDivElement, ComponentProps<"div">>(function SheetBody(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex-1 overflow-y-auto", className)} {...props} />;
});
