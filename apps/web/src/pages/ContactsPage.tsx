import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { GitMerge, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ContactTransactionsSheet } from "../components/ContactTransactionsSheet";
import { MergeContactsDialog } from "../components/MergeContactsDialog";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ContactTypeBadge } from "../components/ui/ContactTypeBadge";
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import type { ContactRow, ContactScope, ContactSort } from "../types";

const GRID_TEMPLATE = "28px 1.6fr 130px 130px 160px 140px";

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

export default function ContactsPage() {
  const { getToken } = useAuth();
  const [sort, setSort] = useState<ContactSort>("recent");
  const [scope, setScope] = useState<ContactScope>("primary");
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  // Debounced: filters server-side (name search runs in the same query as
  // sorting, not a client-side pass over an already-fetched list), so this
  // avoids firing a request on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "list", sort, scope, search],
    queryFn: () => api.getContacts(getToken, { sort, scope, q: search || undefined }),
  });

  const contacts = data?.contacts ?? [];
  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">
          People & places{!isLoading && ` (${contacts.length})`}
        </h1>
        <p className="mt-1 text-sm text-text-400">
          Everyone and everywhere your money has moved through — from bank transfers and
          Spendybot captures alike. Select rows to merge duplicates together.
        </p>
      </div>

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
            <div>
              {contacts.map((contact) => {
                const net = Number(contact.totalDebit) - Number(contact.totalCredit);
                const merged = !!contact.mergedIntoId;
                return (
                  <div
                    key={contact.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedContact(contact)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedContact(contact)}
                    className="grid w-full cursor-pointer items-center border-b border-line px-5 py-3 text-left text-sm last:border-b-0 hover:bg-ink-850"
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}
                  >
                    {merged ? (
                      <span />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelected(contact.id)}
                        className="size-4 cursor-pointer accent-moss-500"
                        aria-label={`Select ${contact.name}`}
                      />
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
                      className={
                        net >= 0
                          ? "whitespace-nowrap font-mono tabular text-rust-400"
                          : "whitespace-nowrap font-mono tabular text-moss-400"
                      }
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
            <Button
              onClick={() => setMergeDialogOpen(true)}
              disabled={selectedIds.size < 2}
              title={selectedIds.size < 2 ? "Select at least 2 contacts to merge" : undefined}
            >
              <GitMerge className="size-4" strokeWidth={1.8} />
              Merge contacts
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
