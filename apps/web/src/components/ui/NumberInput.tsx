import { useEffect, useRef } from "react";
import Cleave from "cleave.js";
import { cn } from "../../lib/cn";

/**
 * A numeric text input with live thousands-separator formatting (Cleave.js).
 * Cleave owns the DOM value once mounted — it reformats on every keystroke —
 * so this is deliberately uncontrolled from React's side rather than a
 * controlled `value` prop: fighting Cleave for control of the input's text
 * is what causes cursor-jump bugs in every React+Cleave integration guide.
 * `onChange` reports the plain unformatted numeric string (Cleave's
 * `rawValue`, e.g. "1234.5"), and `value` only pushes external updates in
 * (e.g. a query refetch) — never while the field is focused/being typed in.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  className,
  decimalScale = 2,
}: {
  value?: string | number;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  className?: string;
  decimalScale?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cleaveRef = useRef<Cleave | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!inputRef.current) return;
    const instance = new Cleave(inputRef.current, {
      numeral: true,
      numeralThousandsGroupStyle: "thousand",
      numeralDecimalScale: decimalScale,
      onValueChanged: (e: { target: { rawValue: string } }) =>
        onChangeRef.current(e.target.rawValue),
    });
    cleaveRef.current = instance;
    return () => instance.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimalScale]);

  useEffect(() => {
    const instance = cleaveRef.current;
    if (!instance || document.activeElement === inputRef.current) return;
    const next = value === undefined || value === null ? "" : String(value);
    if (instance.getRawValue() !== next) instance.setRawValue(next);
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      defaultValue={value === undefined || value === null ? "" : String(value)}
      placeholder={placeholder}
      className={cn(
        "rounded-md border border-line bg-ink-850 px-2.5 py-1.5 text-sm text-text-100 outline-none focus:border-moss-500",
        className
      )}
    />
  );
}
