import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "../api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { ContactTypeBadge } from "./ui/ContactTypeBadge";
import { formatCurrency } from "../lib/formatCurrency";
import type { ContactRow } from "../types";

export function MergeContactsDialog({
  contacts,
  primaryCurrency,
  open,
  onOpenChange,
  onMerged,
}: {
  contacts: ContactRow[];
  primaryCurrency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  // Default to whichever selected contact has the most transactions — the
  // most plausible "real" record among a set of near-duplicates — but the
  // user can always override it before confirming.
  useEffect(() => {
    if (!open || contacts.length === 0) {
      setPrimaryId(null);
      return;
    }
    const mostActive = [...contacts].sort((a, b) => b.transactionCount - a.transactionCount)[0]!;
    setPrimaryId(mostActive.id);
  }, [open, contacts]);

  const merge = useMutation({
    mutationFn: () =>
      api.mergeContacts(getToken, {
        primaryContactId: primaryId!,
        mergeContactIds: contacts.map((c) => c.id).filter((id) => id !== primaryId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onMerged();
      onOpenChange(false);
    },
  });

  const primary = contacts.find((c) => c.id === primaryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge contacts</DialogTitle>
          <DialogDescription>
            Choose which contact is the real one — the rest will be folded into it: their
            transactions move over and their label changes to match.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          {contacts.map((contact) => {
            const isPrimary = contact.id === primaryId;
            const net = Number(contact.totalDebit) - Number(contact.totalCredit);
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => setPrimaryId(contact.id)}
                className={
                  isPrimary
                    ? "flex items-center gap-3 rounded-lg border border-moss-500 bg-moss-400/10 px-3 py-2.5 text-left"
                    : "flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:border-line-strong"
                }
              >
                <span
                  className={
                    isPrimary
                      ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-moss-500 text-ink-950"
                      : "size-5 shrink-0 rounded-full border border-line-strong"
                  }
                >
                  {isPrimary && <Check className="size-3.5" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-100">
                    {contact.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <ContactTypeBadge type={contact.type} />
                    <span className="text-xs text-text-400">
                      {contact.transactionCount} transaction{contact.transactionCount === 1 ? "" : "s"}
                    </span>
                  </span>
                </span>
                <span
                  className={
                    net >= 0
                      ? "shrink-0 whitespace-nowrap font-mono tabular text-sm text-rust-400"
                      : "shrink-0 whitespace-nowrap font-mono tabular text-sm text-moss-400"
                  }
                >
                  {net >= 0 ? "−" : "+"}
                  {formatCurrency(Math.abs(net), primaryCurrency)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={merge.isPending}>
            Cancel
          </Button>
          <Button onClick={() => merge.mutate()} disabled={!primaryId || merge.isPending}>
            {merge.isPending
              ? "Merging…"
              : `Merge into ${primary?.name ?? "…"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
