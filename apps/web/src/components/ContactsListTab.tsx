import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GitMerge, Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { ContactTransactionsSheet } from "./ContactTransactionsSheet";
import { MergeContactsDialog } from "./MergeContactsDialog";
import { TableSkeleton } from "./skeletons/TableSkeleton";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Checkbox } from "./ui/Checkbox";
import { ContactTypeBadge } from "./ui/ContactTypeBadge";
import { Pagination } from "./ui/Pagination";
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { Tooltip } from "./ui/Tooltip";
import { cn } from "../lib/cn";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import type { ContactRow, ContactScope, ContactSort } from "../types";

const GRID_TEMPLATE = "28px 1.6fr 130px 130px 160px 140px";
const ROW_HEIGHT = 60;
const PAGE_SIZE = 25;

const COLUMNS = [
  { header: "", width: "10%" },
  { header: "Name", width: "70%" },
  { header: "Type", width: "35%" },
  { header: "Transactions", width: "35%" },
  { header: "Net flow", width: "45%" },
  { header: "Last interaction", width: "40%" },
];

const SORT_OPTIONS: { value: ContactSort; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "amount", label: "Highest spend" },
  { value: "frequency", label: "Most frequent" },
];

const SCOPE_OPTIONS: { value: ContactScope; label: string }[] = [
  { value: "primary", label: "Primary contacts" },
  { value: "all", label: "All records" },
];

export function ContactsListTab({ onCountChange }: { onCountChange?: (total: number) => void }) {
  const { getToken } = useAuth();
  const [sort, setSort] = useState<ContactSort>("recent");
  const [scope, setScope] = useState<ContactScope>("primary");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounced: filters server-side (name search runs in the same query as
  // sorting, not a client-side pass over an already-fetched list), so this
  // avoids firing a request on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // A new filter/sort invalidates whatever page we were on.
  useEffect(() => {
    setPage(1);
  }, [sort, scope, search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "list", sort, scope, search, page],
    queryFn: () => api.getContacts(getToken, { sort, scope, q: search || undefined, page, pageSize: PAGE_SIZE }),
  });

  const contacts = data?.contacts ?? [];
  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
  const total = data?.pagination?.total ?? 0;

  useEffect(() => {
    if (data) onCountChange?.(total);
  }, [data, total, onCountChange]);

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="pb-16">
      <Card className="p-0">
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-[220px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-600"
              strokeWidth={1.8}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-lg border border-line bg-ink-850 py-2 pl-9 pr-8 text-sm text-text-100 outline-none placeholder:text-text-600 hover:border-line-strong focus-visible:ring-2 focus-visible:ring-moss-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-600 hover:text-text-100"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={scope} onValueChange={(v) => setScope(v as ContactScope)}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as ContactSort)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <TableSkeleton columns={COLUMNS} rows={8} />}
        {error && !data && <p className="p-5 text-rust-400">{(error as Error).message}</p>}
        {data && contacts.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-ink-850 text-text-400">
              <Users className="size-6" strokeWidth={1.6} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-100">
                {search ? `No contacts matching "${search}"` : "No contacts yet"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-text-400">
                {search
                  ? "Try a different name, or clear the search to see everyone."
                  : "As statements and Spendybot captures name people, businesses, and places your money flows through, they'll show up here."}
              </p>
            </div>
          </div>
        )}
        {data && contacts.length > 0 && (
          <div>
            <div
              className="grid border-y border-line px-5 text-left text-xs font-medium uppercase tracking-wide text-text-400"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              {COLUMNS.map((col, i) => (
                <div key={i} className="py-2.5">
                  {col.header}
                </div>
              ))}
            </div>

            <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const contact = contacts[virtualRow.index]!;
                  const net = Number(contact.totalDebit) - Number(contact.totalCredit);
                  const merged = !!contact.mergedIntoId;
                  const isLast = virtualRow.index === contacts.length - 1;
                  return (
                    <div
                      key={contact.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedContact(contact)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedContact(contact)}
                      className={cn(
                        "absolute left-0 top-0 grid w-full cursor-pointer items-center px-5 text-left text-sm transition-colors hover:bg-ink-850",
                        !isLast && "border-b border-line"
                      )}
                      style={{
                        gridTemplateColumns: GRID_TEMPLATE,
                        height: ROW_HEIGHT,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {merged ? (
                        <span />
                      ) : (
                        <span onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleSelected(contact.id)}
                            aria-label={`Select ${contact.name}`}
                          />
                        </span>
                      )}
                      <span className="min-w-0 truncate">
                        <span className="block truncate font-medium text-text-100">{contact.name}</span>
                        {merged && (
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-text-400">
                            <GitMerge className="size-3" strokeWidth={1.8} />
                            Merged into {contact.mergedIntoName}
                          </span>
                        )}
                      </span>
                      <span>
                        <ContactTypeBadge type={contact.type} />
                      </span>
                      <span className="font-mono tabular text-text-400">{contact.transactionCount}</span>
                      <span
                        className={cn(
                          "whitespace-nowrap font-mono tabular",
                          net >= 0 ? "text-rust-400" : "text-moss-400"
                        )}
                      >
                        {net >= 0 ? "−" : "+"}
                        {formatCurrency(Math.abs(net), data.primaryCurrency)}
                      </span>
                      <span className="whitespace-nowrap text-text-400">
                        {contact.lastInteractionAt ? formatDate(contact.lastInteractionAt) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {data.pagination && data.pagination.totalPages > 1 && (
              <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
            )}
          </div>
        )}
      </Card>

      <ContactTransactionsSheet
        contact={selectedContact}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      />

      {data && (
        <MergeContactsDialog
          contacts={selectedContacts}
          primaryCurrency={data.primaryCurrency}
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          onMerged={() => setSelectedIds(new Set())}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-ink-900 px-4 py-3 shadow-xl">
            <span className="text-sm font-medium text-text-100">
              {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected
            </span>
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            {selectedIds.size < 2 ? (
              <Tooltip label="Select at least 2 contacts to merge">
                <span tabIndex={-1} className="inline-flex">
                  <Button disabled>
                    <GitMerge className="size-4" strokeWidth={1.8} />
                    Merge contacts
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button onClick={() => setMergeDialogOpen(true)}>
                <GitMerge className="size-4" strokeWidth={1.8} />
                Merge contacts
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
