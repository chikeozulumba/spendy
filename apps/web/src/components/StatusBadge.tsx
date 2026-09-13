import clsx from "clsx";
import type { StatementStatus } from "../types";
import { TONE_HEX } from "./ui/Badge";

const STYLES: Record<StatementStatus, { label: string; hex: string | null; dot: string; text: string }> = {
  uploaded: { label: "Queued", hex: null, dot: "bg-text-400", text: "text-text-400" },
  processing: { label: "Processing", hex: TONE_HEX.gold, dot: "bg-gold-400 animate-pulse", text: "text-gold-400" },
  done: { label: "Done", hex: TONE_HEX.moss, dot: "bg-moss-400", text: "text-moss-400" },
  failed: { label: "Failed", hex: TONE_HEX.rust, dot: "bg-rust-400", text: "text-rust-400" },
};

// Same "pipeline stage" idiom as before (dot + monospace + tracked
// uppercase — distinct on purpose from the categorical/identity badges,
// which read as filled or outlined pills instead), but tinted per status now
// rather than every stage sharing one flat neutral box — done reads
// green-tinted, failed red-tinted, processing amber, at a glance rather than
// only via the small dot.
export default function StatusBadge({ status }: { status: StatementStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em]",
        s.text,
        !s.hex && "border-line bg-ink-850"
      )}
      style={s.hex ? { backgroundColor: `${s.hex}12`, borderColor: `${s.hex}40` } : undefined}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
