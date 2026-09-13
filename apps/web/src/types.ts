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
  bankName: string | null;
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

export type TransactionSource = "bank_statement" | "telegram";

export interface AllTransactionRow {
  id: string;
  statementId: string | null;
  date: string;
  description: string;
  amount: string;
  direction: "debit" | "credit";
  category: string | null;
  categoryConfidence: string | null;
  isUserOverridden: boolean;
  source: TransactionSource;
  currency: string;
  bankName: string | null;
  originalFilename: string | null;
}

export interface TransactionsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TransactionsMetrics {
  count: number;
  totalDebit: string;
  totalCredit: string;
}

export interface AllTransactions {
  rows: AllTransactionRow[];
  primaryCurrency: string;
  pagination: TransactionsPagination;
  metrics: TransactionsMetrics;
}

export type ContactType = "person" | "business" | "place" | "other" | "unknown";

export interface ContactRow {
  id: string;
  name: string;
  type: ContactType;
  transactionCount: number;
  totalDebit: string;
  totalCredit: string;
  firstInteractionAt: string | null;
  lastInteractionAt: string | null;
}

export type ContactSort = "recent" | "amount" | "frequency";

export interface ContactsList {
  primaryCurrency: string;
  contacts: ContactRow[];
}

export interface ContactCategoryBreakdown {
  category: string;
  count: number;
  total: string;
}

export interface ContactDetailTransaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: "debit" | "credit";
  category: string | null;
  source: TransactionSource;
  currency: string;
  bankName: string | null;
}

export interface ContactDetail {
  contact: { id: string; name: string; type: ContactType; createdAt: string };
  primaryCurrency: string;
  metrics: {
    transactionCount: number;
    totalDebit: string;
    totalCredit: string;
    firstInteractionAt: string | null;
    lastInteractionAt: string | null;
  };
  topCategories: ContactCategoryBreakdown[];
  transactions: ContactDetailTransaction[];
}

export type LoanStatus = "outstanding" | "repaid" | "overdue" | "written_off";

export interface LoanRow {
  id: string;
  transactionId: string;
  counterparty: string | null;
  amount: string;
  expectedRepaymentDate: string | null;
  status: LoanStatus;
  notes: string | null;
  createdAt: string;
  description: string;
  transactionDate: string;
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

export interface SpendingByBankRow {
  bankName: string;
  currency: string;
  total: string;
}

export interface SpendingByBankOverview {
  rows: SpendingByBankRow[];
  primaryCurrency: string;
}

export interface Scope {
  id: string;
  name: string;
  categories: string[];
}

export interface Budget {
  id: string;
  scopeId: string;
  scopeName: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  currency: string;
}

export interface BudgetSummaryRow {
  scopeId: string;
  scopeName: string;
  actual: string;
  budgetId: string | null;
  budgetAmount: string | null;
  overBudget: boolean;
}

export interface BudgetSummary {
  currency: string;
  rows: BudgetSummaryRow[];
}

export interface PeriodComparisonCategoryRow {
  category: string;
  totalA: number;
  totalB: number;
}

export interface PeriodComparison {
  currency: string;
  totalA: number;
  totalB: number;
  categories: PeriodComparisonCategoryRow[];
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
