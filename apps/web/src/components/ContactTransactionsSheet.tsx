import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { cn } from "../lib/cn";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import type { ContactRow } from "../types";
import { CategoryBadge } from "./ui/CategoryBadge";
import { ContactTypeBadge } from "./ui/ContactTypeBadge";
import { Pagination } from "./ui/Pagination";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "./ui/Sheet";
import { Skeleton } from "./ui/Skeleton";

const PAGE_SIZE = 20;
const ROW_HEIGHT = 64;

export function ContactTransactionsSheet({
  contact,
  onOpenChange,
}: {
  contact: ContactRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A fresh contact opened while the sheet is still mounted (clicking a
  // different row without closing first) should always start back on page 1
  // rather than carrying over whatever page the previous contact was on.
  useEffect(() => {
    setPage(1);
  }, [contact?.id]);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts", "detail", contact?.id, page],
    queryFn: () => api.getContact(getToken, contact!.id, { page, pageSize: PAGE_SIZE }),
    enabled: !!contact,
  });

  const transactions = data?.transactions ?? [];
  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const netAmount = contact ? Number(contact.totalDebit) - Number(contact.totalCredit) : 0;
  const netOutflow = netAmount >= 0;

  return (
    <Sheet open={!!contact} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          {contact && (
            <>
              <div className="flex items-center gap-2">
                <SheetTitle>{contact.name}</SheetTitle>
                <ContactTypeBadge type={contact.type} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-400">
                <span className="inline-flex items-center gap-1.5">
                  {netOutflow ? (
                    <TrendingDown className="size-3.5 text-rust-400" strokeWidth={1.8} />
                  ) : (
                    <TrendingUp className="size-3.5 text-moss-400" strokeWidth={1.8} />
                  )}
                  <span
                    className={cn(
                      "font-mono tabular font-medium",
                      netOutflow ? "text-rust-400" : "text-moss-400"
                    )}
                  >
                    {netOutflow ? "−" : "+"}
                    {formatCurrency(Math.abs(netAmount), data?.primaryCurrency ?? "USD")}
                  </span>
                  <span>net</span>
                </span>
                {contact.lastInteractionAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" strokeWidth={1.8} />
                    Last {formatDate(contact.lastInteractionAt)}
                  </span>
                )}
              </div>
            </>
          )}
        </SheetHeader>

        <SheetBody ref={scrollRef}>
          {isLoading && (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-center gap-2 border-b border-line px-5"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && transactions.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-text-400">
              No transactions with this contact yet.
            </p>
          )}

          {data && transactions.length > 0 && (
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const tx = transactions[virtualRow.index]!;
                const isLast = virtualRow.index === transactions.length - 1;
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "absolute left-0 top-0 w-full px-5 py-3 transition-colors hover:bg-ink-850",
                      !isLast && "border-b border-line"
                    )}
                    style={{ height: ROW_HEIGHT, transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="truncate text-sm font-medium text-text-100">{tx.description}</span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap font-mono tabular text-sm",
                          tx.direction === "credit" ? "text-moss-400" : "text-rust-400"
                        )}
                      >
                        {tx.direction === "credit" ? "+" : "−"}
                        {formatCurrency(Number(tx.amount), tx.currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs text-text-400">{formatDate(tx.date)}</span>
                      <CategoryBadge category={tx.category} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetBody>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onChange={setPage} />
        )}
      </SheetContent>
    </Sheet>
  );
}
