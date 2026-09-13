import { useState } from "react";
import { Button } from "./ui/Button";
import { CATEGORIES } from "../types";
import { cn } from "../lib/cn";

/**
 * Inline create/edit form for a budget scope: a name plus which existing
 * transaction categories feed its "actual spend". A category already owned
 * by a different scope is shown disabled (with which scope owns it) rather
 * than hidden — the API enforces the same one-scope-per-category rule, so
 * this is just making that constraint visible before the request round-trips.
 */
export function ScopeForm({
  initialName = "",
  initialCategories = [],
  categoryOwners,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  initialName?: string;
  initialCategories?: string[];
  categoryOwners: Map<string, string>;
  onSubmit: (name: string, categories: string[]) => void;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName);
  const [categories, setCategories] = useState<Set<string>>(new Set(initialCategories));

  function toggle(category: string) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name.trim(), Array.from(categories));
      }}
      className="flex flex-col gap-3 rounded-lg border border-line bg-ink-850 p-4"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Scope name (e.g. Savings)"
        className="rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-text-100 outline-none focus:border-moss-500"
      />
      <div>
        <p className="mb-1.5 text-xs font-medium text-text-400">
          Which categories count toward this scope?
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => {
            const owner = categoryOwners.get(category);
            const disabled = owner !== undefined;
            const checked = categories.has(category);
            return (
              <button
                type="button"
                key={category}
                disabled={disabled}
                onClick={() => toggle(category)}
                title={disabled ? `Already assigned to "${owner}"` : undefined}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  disabled
                    ? "cursor-not-allowed border-line bg-ink-800 text-text-600 opacity-60"
                    : checked
                      ? "border-moss-500 bg-moss-500/10 text-moss-400"
                      : "border-line bg-ink-900 text-text-400 hover:border-line-strong"
                )}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="text-sm">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}
