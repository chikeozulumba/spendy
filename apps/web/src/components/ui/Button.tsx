import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-moss-500 text-ink-950 hover:bg-moss-400 px-4 py-2",
  secondary:
    "bg-ink-850 text-text-100 border border-line hover:border-line-strong px-4 py-2",
  ghost: "text-text-400 hover:text-text-100 px-2 py-1",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, ...props }, ref) => (
    <button ref={ref} className={clsx(base, variants[variant], className)} {...props} />
  )
);
Button.displayName = "Button";
