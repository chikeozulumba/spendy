import { useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { UploadCloud } from "lucide-react";
import { api } from "../api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Switch } from "../components/ui/Switch";

export default function UploadPage() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a PDF first");
      return api.uploadStatement(getToken, file, isProtected ? password : undefined);
    },
    onSuccess: (result) => navigate(`/statements/${result.id}`),
  });

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold tracking-tight text-text-100">
        Upload a bank statement
      </h1>
      <p className="mt-1 text-sm text-text-400">
        PDF only. It's encrypted at rest and used only to extract transactions.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="mt-5 flex flex-col gap-4"
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

        <Button type="submit" disabled={!file || upload.isPending} className="mt-1">
          {upload.isPending ? "Uploading…" : "Upload"}
        </Button>

        {upload.isError && (
          <p className="rounded-lg border border-rust-600 bg-rust-600/10 px-4 py-3 text-sm text-rust-400">
            {(upload.error as Error).message}
          </p>
        )}
      </form>
    </Card>
  );
}
