import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "../lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/Command";

/**
 * shadcn's standard Combobox recipe (Popover + cmdk Command), extended with
 * a "create new" affordance: typing a name that doesn't match any existing
 * bank shows a "Create '<name>'" item. `shouldFilter={false}` on the root
 * Command — with the create item's own value including the raw query text,
 * cmdk's built-in fuzzy filter can't be trusted to always keep it visible
 * (it scores against the item's `value`, not "always show this when no
 * exact match exists"), so filtering is done manually instead.
 */
export function BankCombobox({
  value,
  onValueChange,
  banks,
  placeholder = "Select or add a bank",
}: {
  value: string;
  onValueChange: (value: string) => void;
  banks: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const filtered = trimmed
    ? banks.filter((b) => b.toLowerCase().includes(trimmed.toLowerCase()))
    : banks;
  const exactMatch = banks.some((b) => b.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;

  function choose(bank: string) {
    onValueChange(bank);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm text-text-100 outline-none hover:border-line-strong"
        >
          <span className={cn("truncate", !value && "text-text-600")}>{value || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-text-600" strokeWidth={1.8} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)]">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or add a bank…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !showCreate && <CommandEmpty>No bank found.</CommandEmpty>}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((bank) => (
                  <CommandItem key={bank} value={bank} onSelect={() => choose(bank)}>
                    <Check
                      className={cn("h-4 w-4 shrink-0", value === bank ? "opacity-100" : "opacity-0")}
                      strokeWidth={1.8}
                    />
                    <span className="truncate">{bank}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => choose(trimmed)}
                  className="text-moss-400"
                >
                  <Plus className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">Create "{trimmed}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
