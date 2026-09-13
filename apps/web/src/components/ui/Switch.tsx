import * as SwitchPrimitive from "@radix-ui/react-switch";

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative h-6 w-11 shrink-0 rounded-full bg-ink-850 border border-line outline-none transition-colors data-[state=checked]:bg-moss-600 data-[state=checked]:border-moss-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-1 rounded-full bg-text-400 transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-ink-950" />
    </SwitchPrimitive.Root>
  );
}
