import type { ComponentProps } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export function Select({
  value,
  onValueChange,
  placeholder,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={clsx(
          "inline-flex items-center justify-between gap-2 rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-sm text-text-100 outline-none hover:border-line-strong data-[placeholder]:text-text-600",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="text-text-600">
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 overflow-hidden rounded-lg border border-line-strong bg-ink-850"
        >
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectOption({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative cursor-pointer select-none rounded px-2.5 py-1.5 text-sm text-text-100 outline-none data-[highlighted]:bg-ink-800 data-[state=checked]:text-moss-400"
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

/**
 * shadcn's granular Select API (SelectTrigger/SelectValue/SelectContent/
 * SelectItem), added alongside the simpler `Select`/`SelectOption` wrapper
 * above rather than replacing it — `TransactionsTable` already depends on
 * that wrapper's shape. `SelectRoot` stands in for shadcn's own `Select`
 * export (that name is already taken by the wrapper in this file), so code
 * following shadcn's exact pattern imports it as
 * `import { SelectRoot as Select, ... }`.
 */
export const SelectRoot = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={clsx(
        "inline-flex items-center justify-between gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm text-text-100 outline-none hover:border-line-strong data-[placeholder]:text-text-600",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-text-600">
        <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={4}
        className={clsx(
          "z-50 overflow-hidden rounded-lg border border-line-strong bg-ink-850",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={clsx(
        "relative cursor-pointer select-none rounded px-2.5 py-1.5 text-sm text-text-100 outline-none data-[highlighted]:bg-ink-800 data-[state=checked]:text-moss-400",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
