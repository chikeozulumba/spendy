import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-text-400 transition-colors",
          page <= 1 ? "pointer-events-none opacity-40" : "hover:text-text-100"
        )}
      >
        <ChevronLeft className="size-4" strokeWidth={1.8} />
        Previous
      </button>
      <span className="text-sm text-text-400">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-text-400 transition-colors",
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:text-text-100"
        )}
      >
        Next
        <ChevronRight className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}
