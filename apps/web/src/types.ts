export type StatementStatus = "uploaded" | "processing" | "done" | "failed";

export interface StatementSummary {
  id: string;
  originalFilename: string;
  status: StatementStatus;
  openingBalance: string | null;
  closingBalance: string | null;
  statementPeriodStart: string | null;
  statementPeriodEnd: string | null;
  reconciliationOk: boolean | null;
  currency: string;
  createdAt: string;
}

export interface StatementDetail extends StatementSummary {
  failureReason: string | null;
  reconciliationNote: string | null;
  summary: string | null;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: "debit" | "credit";
  category: string | null;
  categoryConfidence: string | null;
  isUserOverridden: boolean;
}

export interface CategoryBreakdownRow {
  category: string | null;
  total: string;
  count: string;
}

export interface SpendOverTimeRow {
  date: string;
  direction: "debit" | "credit";
  total: string;
}

export interface TopMerchantRow {
  description: string;
  total: string;
  count: string;
}

export interface Insights {
  summary: string | null;
  reconciliationOk: boolean | null;
  reconciliationNote: string | null;
  categoryBreakdown: CategoryBreakdownRow[];
  spendOverTime: SpendOverTimeRow[];
  topMerchants: TopMerchantRow[];
}

export interface SpendingByYearRow {
  year: number;
  category: string;
  currency: string;
  total: string;
}

export interface SpendingOverview {
  rows: SpendingByYearRow[];
  primaryCurrency: string;
}

export const CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Rent/Housing",
  "Utilities",
  "Subscriptions",
  "Entertainment",
  "Shopping",
  "Health",
  "Income",
  "Transfers",
  "Fees/Charges",
  "Other",
] as const;
