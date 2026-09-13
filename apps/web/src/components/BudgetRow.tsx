import { useState } from "react";
import clsx from "clsx";
import { formatCurrency } from "../lib/formatCurrency";
import type { BudgetSummaryRow } from "../types";
import { NumberInput } from "./ui/NumberInput";
import { Badge, type BadgeTone } from "./ui/Badge";

type Tone = "over" | "near" | "ok" | "none";

const TONE: Record<Tone, { bar: string; tone?: BadgeTone; label: string }> = {
  over: { bar: "bg-rust-400", tone: "rust", label: "Over budget" },
  near: { bar: "bg-gold-500", tone: "gold", label: "Near limit" },
  ok: { bar: "bg-moss-400", tone: "moss", label: "On track" },
  none: { bar: "bg-ink-800", label: "No budget set" },
};

function toneFor(row: BudgetSummaryRow): Tone {
  if (row.budgetAmount === null) return "none";
  const ratio = Number(row.actual) / Number(row.budgetAmount);
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "near";
  return "ok";
}

export function BudgetRow({
  row,
  currency,
  onSave,
}: {
  row: BudgetSummaryRow;
  currency: string;
  onSave: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(row.budgetAmount ?? "");
  const tone = toneFor(row);
  const pct =
    row.budgetAmount === null
      ? 0
      : Math.min(100, (Number(row.actual) / Number(row.budgetAmount)) * 100);

  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-text-100">{row.scopeName}</p>
          <p className="text-sm text-text-400">
            {formatCurrency(Number(row.actual), currency)}
            {row.budgetAmount !== null && (
              <> of {formatCurrency(Number(row.budgetAmount), currency)}</>
            )}
          </p>
        </div>
        <Badge variant={TONE[tone].tone ? "soft" : "dashed"} tone={TONE[tone].tone}>
          {TONE[tone].label}
        </Badge>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-850">
        <div
          className={clsx("h-full rounded-full transition-all", TONE[tone].bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(amount);
          if (value > 0) onSave(value);
        }}
        className="flex items-center gap-2"
      >
        <NumberInput value={amount} onChange={setAmount} placeholder="Set budget amount" className="w-40" />
        <button
          type="submit"
          className="rounded-md border border-line px-2.5 py-1.5 text-sm text-text-400 hover:border-line-strong hover:text-text-100"
        >
          {row.budgetAmount === null ? "Set budget" : "Update"}
        </button>
      </form>
    </div>
  );
}
