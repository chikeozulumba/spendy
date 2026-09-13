/**
 * A bespoke line-art illustration for the "no statements yet" empty state —
 * two overlapping statement sheets (one dashed/behind, denoting "nothing
 * filed yet") with a moss "+" badge overlapping the corner, echoing the
 * rounded-stroke language of the brand mark (Logo.tsx) rather than a stock
 * icon or generic clipart.
 */
export function EmptyLedgerIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* back sheet — dashed, further back, representing the absence of a filed statement */}
      <rect
        x="52"
        y="10"
        width="104"
        height="132"
        rx="10"
        stroke="var(--color-line-strong)"
        strokeWidth="2"
        strokeDasharray="5 5"
        fill="var(--color-ink-950)"
        transform="rotate(6 104 76)"
      />
      {/* front sheet */}
      <rect
        x="40"
        y="18"
        width="104"
        height="132"
        rx="10"
        stroke="var(--color-line-strong)"
        strokeWidth="2"
        fill="var(--color-ink-900)"
      />
      {/* text lines */}
      <line x1="58" y1="46" x2="126" y2="46" stroke="var(--color-line-strong)" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="62" x2="110" y2="62" stroke="var(--color-line-strong)" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="78" x2="118" y2="78" stroke="var(--color-line-strong)" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="94" x2="96" y2="94" stroke="var(--color-line-strong)" strokeWidth="3" strokeLinecap="round" />
      {/* moss "+" badge */}
      <circle cx="140" cy="118" r="26" fill="var(--color-moss-500)" stroke="var(--color-ink-950)" strokeWidth="4" />
      <path
        d="M140,106 L140,130 M128,118 L152,118"
        stroke="var(--color-ink-950)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
