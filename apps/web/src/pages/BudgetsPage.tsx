import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PeriodPicker } from "../components/PeriodPicker";
import { ScopeForm } from "../components/ScopeForm";
import { BudgetRow } from "../components/BudgetRow";
import { ScopeRowSkeleton, BudgetRowSkeleton } from "../components/skeletons/BudgetsSkeletons";
import { currentMonth, formatPeriodLabel, type Period } from "../lib/period";

const SUGGESTED_SCOPES = ["Spending", "Savings", "Seed/Giving", "Education"];

export default function BudgetsPage() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>(currentMonth());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingScopeId, setEditingScopeId] = useState<string | null>(null);

  const scopesQuery = useQuery({
    queryKey: ["scopes"],
    queryFn: () => api.getScopes(getToken),
  });

  const summaryQuery = useQuery({
    queryKey: ["budget-summary", period.start, period.end],
    queryFn: () => api.getBudgetSummary(getToken, period.start, period.end),
  });

  const invalidateScopes = () => queryClient.invalidateQueries({ queryKey: ["scopes"] });
  const invalidateSummary = () =>
    queryClient.invalidateQueries({ queryKey: ["budget-summary"] });

  const createScope = useMutation({
    mutationFn: (input: { name: string; categories: string[] }) =>
      api.createScope(getToken, input.name, input.categories),
    onSuccess: () => {
      invalidateScopes();
      invalidateSummary();
      setShowCreateForm(false);
    },
  });

  const updateScope = useMutation({
    mutationFn: (input: { id: string; name: string; categories: string[] }) =>
      api.updateScope(getToken, input.id, { name: input.name, categories: input.categories }),
    onSuccess: () => {
      invalidateScopes();
      invalidateSummary();
      setEditingScopeId(null);
    },
  });

  const deleteScope = useMutation({
    mutationFn: (id: string) => api.deleteScope(getToken, id),
    onSuccess: () => {
      invalidateScopes();
      invalidateSummary();
    },
  });

  const setBudget = useMutation({
    mutationFn: (input: { scopeId: string; amount: number }) =>
      api.setBudget(getToken, {
        scopeId: input.scopeId,
        periodStart: period.start,
        periodEnd: period.end,
        amount: input.amount,
        currency: summaryQuery.data?.currency ?? "USD",
      }),
    onSuccess: invalidateSummary,
  });

  const scopes = scopesQuery.data ?? [];
  // category -> name of the scope that already owns it, excluding whichever
  // scope is currently being edited (a scope editing its own categories
  // shouldn't see itself listed as a conflicting owner).
  const categoryOwners = new Map<string, string>();
  for (const scope of scopes) {
    if (scope.id === editingScopeId) continue;
    for (const category of scope.categories) categoryOwners.set(category, scope.name);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">Budgets</h1>
        <p className="mt-1 text-sm text-text-400">
          Set spending targets by scope and track them against your categorized transactions.
        </p>
      </div>

      <Card>
        <CardHeader className="sm:flex-row items-center justify-between">
          <div>
            <CardTitle>Scopes</CardTitle>
            <CardDescription>
              Group your transaction categories into scopes you budget against.
            </CardDescription>
          </div>
          {!showCreateForm && (
            <Button variant="secondary" onClick={() => setShowCreateForm(true)}>
              <Plus className="size-4" />
              Add scope
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {scopesQuery.isLoading && (
            <>
              <ScopeRowSkeleton />
              <ScopeRowSkeleton />
              <ScopeRowSkeleton />
            </>
          )}

          {!scopesQuery.isLoading && scopes.length === 0 && !showCreateForm && (
            <div className="flex flex-col gap-3">
              <p className="text-text-400">
                No scopes yet. Create one to start budgeting — for example:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SCOPES.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => createScope.mutate({ name: suggestion, categories: [] })}
                    className="rounded-full border border-line bg-ink-850 px-3 py-1.5 text-sm text-text-100 hover:border-line-strong"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {scopes.map((scope) =>
            editingScopeId === scope.id ? (
              <ScopeForm
                key={scope.id}
                initialName={scope.name}
                initialCategories={scope.categories}
                categoryOwners={categoryOwners}
                submitLabel="Save changes"
                onSubmit={(name, categories) =>
                  updateScope.mutate({ id: scope.id, name, categories })
                }
                onCancel={() => setEditingScopeId(null)}
              />
            ) : (
              <div
                key={scope.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3"
              >
                <div>
                  <p className="font-medium text-text-100">{scope.name}</p>
                  <p className="mt-0.5 text-xs text-text-400">
                    {scope.categories.length === 0
                      ? "No categories assigned yet"
                      : scope.categories.join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingScopeId(scope.id)}
                    className="text-sm text-text-400 hover:text-text-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete scope "${scope.name}"? Its budgets will be removed too.`)) {
                        deleteScope.mutate(scope.id);
                      }
                    }}
                    className="text-sm text-rust-400 hover:text-rust-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}

          {showCreateForm && (
            <ScopeForm
              categoryOwners={categoryOwners}
              submitLabel="Create scope"
              onSubmit={(name, categories) => createScope.mutate({ name, categories })}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {createScope.error && (
            <p className="text-sm text-rust-400">{(createScope.error as Error).message}</p>
          )}
          {updateScope.error && (
            <p className="text-sm text-rust-400">{(updateScope.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="sm:flex-row items-center justify-between">
          <div>
            <CardTitle>Budgets for {formatPeriodLabel(period)}</CardTitle>
            <CardDescription>Actual spend per scope against what you budgeted.</CardDescription>
          </div>
          <PeriodPicker period={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          {scopesQuery.isLoading || (scopes.length > 0 && summaryQuery.isLoading) ? (
            Array.from({ length: Math.max(scopes.length, 1) }).map((_, i) => (
              <BudgetRowSkeleton key={i} />
            ))
          ) : scopes.length === 0 ? (
            <p className="text-text-400">Create a scope above to start tracking a budget.</p>
          ) : (
            summaryQuery.data?.rows.map((row) => (
              <BudgetRow
                key={row.scopeId}
                row={row}
                currency={summaryQuery.data!.currency}
                onSave={(amount) => setBudget.mutate({ scopeId: row.scopeId, amount })}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
