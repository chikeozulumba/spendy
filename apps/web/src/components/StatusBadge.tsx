import clsx from "clsx";
import type { StatementStatus } from "../types";

const STYLES: Record<StatementStatus, { label: string; dot: string; text: string }> = {
  uploaded: { label: "Queued", dot: "bg-text-400", text: "text-text-400" },
  processing: { label: "Processing", dot: "bg-gold-400 animate-pulse", text: "text-gold-400" },
  done: { label: "Done", dot: "bg-moss-400", text: "text-moss-400" },
  failed: { label: "Failed", dot: "bg-rust-400", text: "text-rust-400" },
};

export default function StatusBadge({ status }: { status: StatementStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-850 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em]",
        s.text
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
