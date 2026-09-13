import { Plus } from "lucide-react";
import { Button } from "./ui/Button";
import { EmptyLedgerIllustration } from "./EmptyLedgerIllustration";
import { useUploadModal } from "../context/UploadModalContext";

export function EmptyLedgerState() {
  const { open } = useUploadModal();

  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-line bg-ink-900 px-6 py-16 text-center">
      <EmptyLedgerIllustration className="h-36 w-auto" />
      <div>
        <h2 className="text-lg font-semibold text-text-100">No statements yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-text-400">
          Upload your first bank statement and Spendy will extract the transactions, check the
          math, and sort the spending — your dashboard shows up right after.
        </p>
      </div>
      <Button onClick={open}>
        <Plus className="size-4" />
        Upload a statement
      </Button>
    </div>
  );
}
