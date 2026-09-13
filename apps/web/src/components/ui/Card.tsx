import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-ink-900 p-5", className)}
      {...props}
    />
  );
}

/**
 * shadcn's Card subcomponents (CardHeader/CardTitle/CardDescription/
 * CardContent/CardFooter), adapted to this app's Card: shadcn's own Card
 * ships with no padding and lets each section add its own — ours already has
 * uniform padding (every existing <Card> in the app relies on that), so
 * these only add internal spacing/borders rather than re-adding horizontal
 * padding, and compose fine inside the existing padded Card without
 * disturbing any of its current plain-children usages.
 */
export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-0 border-b border-line pb-4 sm:flex-col sm:items-start",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-semibold leading-none text-text-100",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-sm text-text-400", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center border-t border-line pt-4",
        className,
      )}
      {...props}
    />
  );
}
