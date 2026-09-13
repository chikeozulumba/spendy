import { HandCoins } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/Card";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import type { LoanRow } from "../types";

/**
 * Money still expected back — outstanding and overdue loans, soonest due
 * date first. Sits beside the (now half-width) ledger on the homepage: the
 * ledger is what already happened, this is what's still owed to the user.
 */
export function ExpectedInflowList({ loans, currency }: { loans: LoanRow[]; currency: string }) {
  const pending = loans
    .filter((loan) => loan.status === "outstanding" || loan.status === "overdue")
    .sort((a, b) => {
      if (!a.expectedRepaymentDate) return 1;
      if (!b.expectedRepaymentDate) return -1;
      return a.expectedRepaymentDate.localeCompare(b.expectedRepaymentDate);
    });

  return (
    <Card className="flex flex-col p-0">
      <CardHeader className="border-b border-line px-5 py-4">
        <CardTitle>Expected inflow</CardTitle>
        <CardDescription>Loans you're still owed, soonest due date first</CardDescription>
      </CardHeader>

      {pending.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink-850 text-text-400">
            <HandCoins className="size-5" strokeWidth={1.6} />
          </span>
          <p className="text-sm text-text-400">Nothing outstanding right now.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {pending.map((loan) => (
            <div key={loan.id} className="flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-text-100">{loan.counterparty ?? "Unknown"}</p>
                <p className="mt-0.5 truncate text-xs text-text-400">{loan.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono tabular text-sm font-medium text-text-100">
                  {formatCurrency(Number(loan.amount), currency)}
                </p>
                <div className="mt-1 flex items-center justify-end gap-1.5">
                  {loan.status === "overdue" ? (
                    <Badge variant="soft" tone="rust">
                      Overdue
                    </Badge>
                  ) : loan.expectedRepaymentDate ? (
                    <span className="whitespace-nowrap text-xs text-text-400">
                      Due {formatDate(loan.expectedRepaymentDate)}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-text-600">No due date</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
