import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function StatementsListPage() {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["statements"],
    queryFn: () => api.listStatements(getToken),
    refetchInterval: 5000,
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-text-100">Your ledger</h1>
        <Link to="/upload">
          <Button>Upload statement</Button>
        </Link>
      </div>

      <Card className="p-0">
        {isLoading && <p className="p-5 text-text-400">Loading…</p>}
        {error && (
          <p className="p-5 text-rust-400">{(error as Error).message}</p>
        )}
        {data && data.length === 0 && (
          <p className="p-5 text-text-400">
            Nothing filed yet. Upload your first bank statement to start reconciling.
          </p>
        )}
        {data?.map((s, i) => (
          <Link
            key={s.id}
            to={`/statements/${s.id}`}
            className={
              "flex items-center justify-between px-5 py-3.5 text-text-100 transition-colors hover:bg-ink-850 " +
              (i > 0 ? "border-t border-line" : "")
            }
          >
            <span className="truncate font-mono text-sm">{s.originalFilename}</span>
            <span className="flex shrink-0 items-center gap-3">
              {s.reconciliationOk === false && (
                <span className="text-xs text-rust-400">⚠ review</span>
              )}
              <StatusBadge status={s.status} />
            </span>
          </Link>
        ))}
      </Card>
    </div>
  );
}
