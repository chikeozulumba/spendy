import { useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { KeyRound, UploadCloud } from "lucide-react";
import { api, ApiError } from "../api";
import { Button } from "./ui/Button";
import { Switch } from "./ui/Switch";
import { BankCombobox } from "./BankCombobox";
import { ApiKeyModal } from "./ApiKeyModal";

export function UploadForm({ onSuccess }: { onSuccess: (statementId: string) => void }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bankName, setBankName] = useState("");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  const banksQuery = useQuery({
    queryKey: ["banks"],
    queryFn: () => api.getBankNames(getToken),
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.getMe(getToken),
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a PDF first");
      return api.uploadStatement(getToken, file, isProtected ? password : undefined, bankName);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onSuccess(result.id);
    },
  });

  const limitReached =
    upload.error instanceof ApiError && upload.error.code === "STATEMENT_LIMIT_REACHED";
  const me = meQuery.data;
  const remaining =
    me && me.statements.limit !== null ? Math.max(0, me.statements.limit - me.statements.used) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        upload.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        className={clsx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          isDragging ? "border-moss-500 bg-ink-850" : "border-line-strong hover:border-moss-500/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="sr-only"
        />
        <UploadCloud className="h-6 w-6 text-text-600" strokeWidth={1.8} />
        {file ? (
          <span className="font-mono text-sm text-text-100">{file.name}</span>
        ) : (
          <>
            <span className="text-sm text-text-100">Drop a PDF here, or click to browse</span>
            <span className="text-xs text-text-600">One statement at a time</span>
          </>
        )}
      </label>

      <div>
        <label className="mb-1.5 block text-sm text-text-100">
          Bank <span className="text-text-600">(optional — inferred if left blank)</span>
        </label>
        <BankCombobox value={bankName} onValueChange={setBankName} banks={banksQuery.data ?? []} />
      </div>

      <label className="flex items-center gap-3 text-sm text-text-100">
        <Switch checked={isProtected} onCheckedChange={setIsProtected} />
        This PDF is password-protected
      </label>

      {isProtected && (
        <input
          type="password"
          placeholder="PDF password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-line bg-ink-850 px-3 py-2 text-sm text-text-100 outline-none focus:border-moss-500"
        />
      )}

      <Button type="submit" disabled={!file || upload.isPending || limitReached} className="mt-1">
        {upload.isPending ? "Uploading…" : "Upload"}
      </Button>

      {!me?.isAdmin && !me?.hasOwnApiKey && remaining !== null && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-600">
          <span>
            {remaining} of {me?.statements.limit} statement{me?.statements.limit === 1 ? "" : "s"}{" "}
            remaining.
          </span>
          <button
            type="button"
            onClick={() => setApiKeyModalOpen(true)}
            className="inline-flex items-center gap-1 text-text-400 underline underline-offset-2 hover:text-text-100"
          >
            <KeyRound className="size-3" strokeWidth={1.8} />
            Use your own API key for unlimited processing
          </button>
        </p>
      )}

      {upload.isError && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-rust-600 bg-rust-600/10 px-4 py-3 text-sm text-rust-400">
          <p>{(upload.error as Error).message}</p>
          {limitReached && (
            <Button type="button" variant="secondary" onClick={() => setApiKeyModalOpen(true)}>
              <KeyRound className="size-4" />
              Add your API key to continue
            </Button>
          )}
        </div>
      )}

      <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} me={me} />
    </form>
  );
}
